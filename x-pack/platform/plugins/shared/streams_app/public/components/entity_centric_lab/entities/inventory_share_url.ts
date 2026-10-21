/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedViewState } from './use_saved_views';
import { parseSavedViewState } from './use_saved_views';

/**
 * Query param carrying a base64url-encoded snapshot of the inventory page so a
 * URL can be shared across browsers/users without relying on localStorage
 * saved views.
 */
export const INVENTORY_SHARE_QUERY_KEY = 'inventory';

const PAYLOAD_VERSION = 1;

const base64UrlEncode = (json: string): string => {
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const base64UrlDecode = (encoded: string): string => {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + '='.repeat(padLen));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export const encodeInventorySharePayload = (state: SavedViewState): string => {
  const json = JSON.stringify({ v: PAYLOAD_VERSION, s: state });
  return base64UrlEncode(json);
};

export const decodeInventorySharePayload = (encoded: string): SavedViewState | null => {
  try {
    const parsed: unknown = JSON.parse(base64UrlDecode(encoded));
    if (!parsed || typeof parsed !== 'object') return null;
    const source = parsed as { v?: unknown; s?: unknown };
    if (source.v !== PAYLOAD_VERSION) return null;
    const state = parseSavedViewState(source.s);
    return state ?? null;
  } catch {
    return null;
  }
};

export const readInventorySharePayloadFromSearch = (
  search: string
): SavedViewState | null => {
  const raw = new URLSearchParams(search).get(INVENTORY_SHARE_QUERY_KEY);
  if (!raw) return null;
  return decodeInventorySharePayload(raw);
};
