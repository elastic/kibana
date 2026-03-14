/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TEMPORARY UNTIL FIXED!
// DIRECT COPY FROM `src/core/utils/url`, since it's not possible to import from there,
// nor can I re-export from `src/core/server`...

import type { ParsedQuery } from 'query-string';
import type { UrlObject } from 'url';
import { format as formatUrl } from 'url';

const parseAbsoluteUrl = (url: string): URL | undefined => {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
};

const parseProtocolRelativeUrl = (url: string): URL | undefined => {
  if (!url.startsWith('//')) {
    return undefined;
  }

  try {
    return new URL(`http:${url}`);
  } catch {
    return undefined;
  }
};

const splitRelativeUrl = (url: string) => {
  const hashIndex = url.indexOf('#');
  const beforeHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const hash = hashIndex === -1 ? null : url.slice(hashIndex) || null;
  const searchIndex = beforeHash.indexOf('?');
  const pathname =
    searchIndex === -1 ? beforeHash || null : beforeHash.slice(0, searchIndex) || null;
  const search = searchIndex === -1 ? null : beforeHash.slice(searchIndex) || null;

  return { hash, pathname, search };
};

const parseQuery = (searchParams: URLSearchParams): ParsedQuery => {
  const query: ParsedQuery = {};

  for (const [key, value] of searchParams.entries()) {
    const existingValue = query[key];

    if (existingValue === undefined) {
      query[key] = value;
      continue;
    }

    query[key] = Array.isArray(existingValue)
      ? [...existingValue.filter((item): item is string => item !== null), value]
      : existingValue === null
      ? value
      : [existingValue, value];
  }

  return query;
};

const formatAuth = (username: string, password: string): string | null => {
  if (!username && !password) {
    return null;
  }

  if (!password) {
    return decodeURIComponent(username);
  }

  return `${decodeURIComponent(username)}:${decodeURIComponent(password)}`;
};

const parseMeaningfulUrlParts = (url: string): URLMeaningfulParts => {
  const absoluteUrl = parseAbsoluteUrl(url);
  const protocolRelativeUrl = absoluteUrl ? undefined : parseProtocolRelativeUrl(url);
  const parsedUrl = absoluteUrl ?? protocolRelativeUrl;

  if (!parsedUrl) {
    const { hash, pathname, search } = splitRelativeUrl(url);

    return {
      auth: null,
      hash,
      hostname: null,
      pathname,
      port: null,
      protocol: null,
      query: parseQuery(new URLSearchParams(search?.slice(1) ?? '')),
      slashes: null,
    };
  }

  return {
    auth: formatAuth(parsedUrl.username, parsedUrl.password),
    hash: parsedUrl.hash || null,
    hostname: parsedUrl.hostname || null,
    pathname: parsedUrl.pathname || null,
    port: parsedUrl.port || null,
    protocol: absoluteUrl ? parsedUrl.protocol || null : null,
    query: parseQuery(parsedUrl.searchParams),
    slashes: true,
  };
};

export interface URLMeaningfulParts {
  auth: string | null;
  hash: string | null;
  hostname: string | null;
  pathname: string | null;
  protocol: string | null;
  slashes: boolean | null;
  port: string | null;
  query: ParsedQuery | {};
}

/**
 *  Takes a URL and a function that takes the meaningful parts
 *  of the URL as a key-value object, modifies some or all of
 *  the parts, and returns the modified parts formatted again
 *  as a url.
 *
 *  Url Parts sent:
 *    - protocol
 *    - slashes (does the url have the //)
 *    - auth
 *    - hostname (just the name of the host, no port or auth information)
 *    - port
 *    - pathname (the path after the hostname, no query or hash, starts
 *        with a slash if there was a path)
 *    - query (always an object, even when no query on original url)
 *    - hash
 *
 *  Why?
 *    - The default url library in node produces several conflicting
 *      properties on the "parsed" output. Modifying any of these might
 *      lead to the modifications being ignored (depending on which
 *      property was modified)
 *    - It's not always clear whether to use path/pathname, host/hostname,
 *      so this tries to add helpful constraints
 *
 *  @param url The string url to parse.
 *  @param urlModifier A function that will modify the parsed url, or return a new one.
 *  @returns The modified and reformatted url
 */
export function modifyUrl(
  url: string,
  urlModifier: (urlParts: URLMeaningfulParts) => Partial<URLMeaningfulParts> | undefined
) {
  if (typeof url !== 'string') {
    throw new TypeError('Expected URL to be a string');
  }

  if (typeof urlModifier !== 'function') {
    throw new TypeError('Expected urlModifier to be a function');
  }

  const parsed = parseMeaningfulUrlParts(url);

  // Copy over the most specific version of each property. By default, the parsed url includes several
  // conflicting properties (like path and pathname + search, or search and query) and keeping track
  // of which property is actually used when they are formatted is harder than necessary.
  const meaningfulParts: URLMeaningfulParts = {
    auth: parsed.auth,
    hash: parsed.hash,
    hostname: parsed.hostname,
    pathname: parsed.pathname,
    port: parsed.port,
    protocol: parsed.protocol,
    query: parsed.query || {},
    slashes: parsed.slashes,
  };

  // The urlModifier modifies the meaningfulParts object, or returns a new one.
  const modifiedParts = urlModifier(meaningfulParts) || meaningfulParts;

  // Format the modified/replaced meaningfulParts back into a url.
  return formatUrl({
    auth: modifiedParts.auth,
    hash: modifiedParts.hash,
    hostname: modifiedParts.hostname,
    pathname: modifiedParts.pathname,
    port: modifiedParts.port,
    protocol: modifiedParts.protocol,
    query: modifiedParts.query,
    slashes: modifiedParts.slashes,
  } as UrlObject);
}
