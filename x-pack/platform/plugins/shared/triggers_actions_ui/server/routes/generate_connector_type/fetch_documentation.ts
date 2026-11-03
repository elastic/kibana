/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { promises as dns } from 'dns';
import { load } from 'cheerio';
import ipaddr from 'ipaddr.js';
import { Agent, ProxyAgent, fetch as undiciFetch } from 'undici';
import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { GenerateConnectorTypeError, isGenerateConnectorTypeError } from './types';
import type { FetchedDocument } from './types';

/**
 * Minimal response shape so tests can inject fetch without a real undici Response.
 * Production uses undici fetch, which satisfies this shape.
 */
interface DocumentationResponse {
  status: number;
  headers: { get?: (name: string) => string | null } | Record<string, unknown>;
  text?: () => Promise<string>;
  data?: unknown;
}

type DocumentationFetch = (
  url: string,
  init: {
    method: string;
    redirect: 'manual';
    headers: { accept: string };
    signal: AbortSignal;
    dispatcher: Agent | ProxyAgent;
  }
) => Promise<DocumentationResponse>;

const ALLOWED_CONTENT_TYPES = new Set([
  'text/html',
  'text/plain',
  'text/markdown',
  'application/json',
]);

const BLOCKED_RANGES = new Set([
  'loopback',
  'private',
  'linkLocal',
  'uniqueLocal',
  'unspecified',
  'carrierGradeNat',
  'multicast',
  'broadcast',
  'reserved',
  'ipv4Mapped',
]);

const ACCEPT_HEADER = 'text/html, text/plain, text/markdown, application/json';

const normalizeHostname = (hostname: string): string =>
  hostname
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '')
    .split('%')[0]
    .toLowerCase();

const isLocalhostName = (hostname: string): boolean =>
  hostname === 'localhost' || hostname.endsWith('.localhost');

const isBlockedAddress = (rawAddress: string): boolean => {
  const address = normalizeHostname(rawAddress);
  if (!ipaddr.isValid(address)) {
    return true;
  }
  return BLOCKED_RANGES.has(ipaddr.parse(address).range());
};

const addressesFromLookup = (resolved: unknown): string[] => {
  const entries = Array.isArray(resolved) ? resolved : [resolved];
  return entries.flatMap((entry) => {
    if (typeof entry === 'string') {
      return [entry];
    }
    if (entry && typeof entry === 'object' && 'address' in entry) {
      const address = (entry as { address?: unknown }).address;
      return typeof address === 'string' ? [address] : [];
    }
    return [];
  });
};

const resolveAddresses = async (hostname: string, lookup: typeof dns.lookup): Promise<string[]> => {
  const literal = ipaddr.isValid(hostname) ? [hostname] : [];
  try {
    const resolved = await lookup(hostname, { all: true, verbatim: true });
    const addresses = [...literal, ...addressesFromLookup(resolved)];
    if (addresses.length === 0) {
      throw new GenerateConnectorTypeError('fetch_failed', `Could not resolve "${hostname}".`, 400);
    }
    return addresses;
  } catch (error) {
    if (isGenerateConnectorTypeError(error)) {
      throw error;
    }
    if (literal.length > 0) {
      return literal;
    }
    const message = error instanceof Error ? error.message : `Could not resolve "${hostname}".`;
    throw new GenerateConnectorTypeError('fetch_failed', message, 400);
  }
};

/** Rejects non-http(s) URLs and destinations that resolve to a non-public address. */
export const assertPublicDestination = async (
  url: URL,
  lookup: typeof dns.lookup = dns.lookup
): Promise<void> => {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new GenerateConnectorTypeError(
      'invalid_url',
      'Only http and https URLs are allowed.',
      400
    );
  }

  const hostname = normalizeHostname(url.hostname);
  if (!hostname) {
    throw new GenerateConnectorTypeError('invalid_url', 'URL is missing a host.', 400);
  }
  if (isLocalhostName(hostname)) {
    throw new GenerateConnectorTypeError(
      'blocked_destination',
      `Destination "${hostname}" is not allowed.`,
      400
    );
  }

  const addresses = await resolveAddresses(hostname, lookup);
  if (addresses.some(isBlockedAddress)) {
    throw new GenerateConnectorTypeError(
      'blocked_destination',
      `Destination "${hostname}" resolves to a blocked address.`,
      400
    );
  }
};

const parseHttpUrl = (value: string, base?: URL): URL => {
  try {
    return new URL(value, base);
  } catch {
    throw new GenerateConnectorTypeError('invalid_url', `Invalid URL "${value}".`, 400);
  }
};

const readHeader = (headers: unknown, name: string): string | undefined => {
  if (!headers || typeof headers !== 'object') {
    return undefined;
  }
  const record = headers as Record<string, unknown> & { get?: (key: string) => unknown };
  const fromGetter = typeof record.get === 'function' ? record.get(name) : undefined;
  const value = fromGetter ?? record[name] ?? record[name.toLowerCase()];
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }
  return undefined;
};

const mediaTypeOf = (contentType: string): string => contentType.split(';')[0].trim().toLowerCase();

const mapFetchError = (error: unknown): GenerateConnectorTypeError => {
  if (isGenerateConnectorTypeError(error)) {
    return error;
  }
  const message = error instanceof Error ? error.message : 'Failed to fetch the documentation.';
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';
  if (
    code === 'ERR_FR_MAX_BODY_LENGTH_EXCEEDED' ||
    /maxContentLength|maxBodyLength|maxResponseSize|entity too large/i.test(message)
  ) {
    return new GenerateConnectorTypeError('too_large', message, 400);
  }
  return new GenerateConnectorTypeError('fetch_failed', message, 400);
};

/** Drops boilerplate from HTML and leaves other allowed content as text. */
export const extractText = ({
  contentType,
  body,
}: {
  contentType: string;
  body: string;
}): string => {
  if (mediaTypeOf(contentType) !== 'text/html') {
    return body;
  }
  const $ = load(body);
  $('script, style, noscript, nav, footer, header, svg, iframe').remove();
  return $('body').text().replace(/\s+/g, ' ').trim();
};

const readBody = async (
  response: DocumentationResponse,
  maxContentLength: number
): Promise<string> => {
  const body =
    typeof response.text === 'function' ? await response.text() : String(response.data ?? '');
  if (Buffer.byteLength(body) > maxContentLength) {
    throw new GenerateConnectorTypeError(
      'too_large',
      `Response exceeds the ${maxContentLength} byte limit.`,
      400
    );
  }
  return body;
};

const abortAfter = (timeout: number): { signal: AbortSignal; cancel: () => void } => {
  if (typeof AbortSignal.timeout === 'function') {
    return { signal: AbortSignal.timeout(timeout), cancel: () => undefined };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  return { signal: controller.signal, cancel: () => clearTimeout(timer) };
};

const createDispatcher = (
  configurationUtilities: ActionsConfigurationUtilities,
  timeout: number,
  maxContentLength: number
): Agent | ProxyAgent => {
  const limits = {
    headersTimeout: timeout,
    bodyTimeout: timeout,
    ...(maxContentLength > 0 ? { maxResponseSize: maxContentLength } : {}),
  };
  const proxySettings = configurationUtilities.getProxySettings?.();
  if (proxySettings?.proxyUrl) {
    return new ProxyAgent({ uri: proxySettings.proxyUrl, ...limits });
  }
  return new Agent(limits);
};

/** Fetches a documentation URL with host, redirect, size and content-type guards. */
export const fetchDocumentation = async ({
  url,
  configurationUtilities,
  logger,
  fetch: fetchImpl = undiciFetch as unknown as DocumentationFetch,
  lookup = dns.lookup,
  maxRedirects = 3,
}: {
  url: string;
  configurationUtilities: ActionsConfigurationUtilities;
  logger: Logger;
  fetch?: DocumentationFetch;
  lookup?: typeof dns.lookup;
  maxRedirects?: number;
}): Promise<FetchedDocument> => {
  let currentUrl = parseHttpUrl(url);
  const { maxContentLength, timeout } = configurationUtilities.getResponseSettings();

  for (let followed = 0; ; followed++) {
    await assertPublicDestination(currentUrl, lookup);
    const current = currentUrl.toString();
    try {
      configurationUtilities.ensureUriAllowed(current);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Destination is not allowed.';
      throw new GenerateConnectorTypeError('blocked_destination', message, 400);
    }

    let response: DocumentationResponse;
    const abort = abortAfter(timeout);
    try {
      logger.debug(`Fetching connector documentation from ${current}`);
      response = await fetchImpl(current, {
        method: 'GET',
        redirect: 'manual',
        headers: { accept: ACCEPT_HEADER },
        signal: abort.signal,
        dispatcher: createDispatcher(configurationUtilities, timeout, maxContentLength),
      });
    } catch (error) {
      throw mapFetchError(error);
    } finally {
      abort.cancel();
    }

    if (response.status >= 300 && response.status < 400) {
      if (followed >= maxRedirects) {
        throw new GenerateConnectorTypeError('fetch_failed', 'Too many redirects.', 400);
      }
      const location = readHeader(response.headers, 'location');
      if (!location) {
        throw new GenerateConnectorTypeError(
          'fetch_failed',
          'Redirect is missing a Location header.',
          400
        );
      }
      currentUrl = parseHttpUrl(location, currentUrl);
      continue;
    }

    const contentType = readHeader(response.headers, 'content-type') ?? '';
    const mediaType = mediaTypeOf(contentType);
    if (!ALLOWED_CONTENT_TYPES.has(mediaType)) {
      throw new GenerateConnectorTypeError(
        'unsupported_content',
        `Unsupported content type "${mediaType || 'unknown'}".`,
        400
      );
    }

    const body = await readBody(response, maxContentLength);
    return {
      url: current,
      contentType: mediaType,
      text: extractText({ contentType: mediaType, body }),
    };
  }
};
