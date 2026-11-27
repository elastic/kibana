/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const KI_URI_PREFIX = 'ki://';
const CONVERSATION_URI_PREFIX = 'conversation://';

const idFromUri = (uri: string, prefix: string): string | undefined => {
  const id = uri.startsWith(prefix) ? uri.slice(prefix.length) : '';
  return id.length > 0 ? id : undefined;
};

/** The URI of a KI in the same AI index. */
export const kiUri = (kiId: string): string => `${KI_URI_PREFIX}${kiId}`;

export const kiIdFromUri = (uri: string): string | undefined => idFromUri(uri, KI_URI_PREFIX);

/** The URI of an Agent Builder conversation. */
export const conversationUri = (conversationId: string): string =>
  `${CONVERSATION_URI_PREFIX}${conversationId}`;

export const conversationIdFromUri = (uri: string): string | undefined =>
  idFromUri(uri, CONVERSATION_URI_PREFIX);

export interface ParsedKiUri {
  scheme: string;
  identifier: string;
}

const KI_URI_PATTERN = /^([^:]+):\/\/(.+)$/;

export const KI_URI_SCHEME_WORKFLOW = 'workflow';
export const KI_URI_SCHEME_TOOL = 'tool';

/** Splits URIs such as `workflow://id` or `tool://platform.foo.bar`. */
export const parseKiUri = (uri: string): ParsedKiUri | undefined => {
  const match = KI_URI_PATTERN.exec(uri);
  if (!match) {
    return undefined;
  }
  const scheme = match[1];
  const identifier = match[2];
  if (scheme.length === 0 || identifier.length === 0) {
    return undefined;
  }
  return { scheme, identifier };
};
