/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import Boom from '@hapi/boom';
import type {
  IndicatorType,
  InvestigationPriority,
} from '../../common/investigations/types';

export const encodeVersion = (seqNo?: number, primaryTerm?: number): string | undefined =>
  seqNo === undefined || primaryTerm === undefined ? undefined : `${seqNo}:${primaryTerm}`;

export const decodeVersion = (version: string): { if_seq_no: number; if_primary_term: number } => {
  const [seq, term] = version.split(':').map((part) => Number(part));
  if (!Number.isInteger(seq) || !Number.isInteger(term)) {
    throw Boom.badRequest(`Invalid version "${version}"; expected "seq_no:primary_term"`);
  }
  return { if_seq_no: seq, if_primary_term: term };
};

const canonical = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
};

/** SHA-256 of a value's canonical JSON, so equal snapshots always hash the same. */
export const hashSnapshot = (value: unknown): string =>
  createHash('sha256').update(canonical(value)).digest('hex');

export const sha256 = (value: string | Buffer): string =>
  createHash('sha256').update(value).digest('hex');

export const PRIORITY_RANK: Record<InvestigationPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const IPV6 = /^[0-9a-f:]+:[0-9a-f:]*$/i;
const HASH = /^([a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64}|[a-f0-9]{128})$/i;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const URL_RE = /^[a-z][a-z0-9+.-]*:\/\//i;
const DOMAIN = /^(?=.{1,253}$)([a-z0-9-]{1,63}\.)+[a-z]{2,63}$/i;

/** Best-effort indicator type from its value. */
export const inferIndicatorType = (value: string): IndicatorType => {
  const v = value.trim();
  if (IPV4.test(v) || IPV6.test(v)) return 'ip';
  if (HASH.test(v)) return 'file_hash';
  if (EMAIL.test(v)) return 'email';
  if (URL_RE.test(v)) return 'url';
  if (/^HK(LM|CU|CR|U|CC)\\/i.test(v) || /^HKEY_/i.test(v)) return 'registry_key';
  if (/^[a-z]:\\/i.test(v) || v.startsWith('/')) return 'file_path';
  if (DOMAIN.test(v)) return 'domain';
  return 'other';
};

const INDICATOR_TYPE_ALIASES: Record<string, IndicatorType> = {
  ip: 'ip',
  'ip address': 'ip',
  ipv4: 'ip',
  ipv6: 'ip',
  domain: 'domain',
  hostname: 'domain',
  url: 'url',
  hash: 'file_hash',
  'file hash': 'file_hash',
  file_hash: 'file_hash',
  sha256: 'file_hash',
  md5: 'file_hash',
  sha1: 'file_hash',
  'file path': 'file_path',
  file_path: 'file_path',
  path: 'file_path',
  email: 'email',
  'email address': 'email',
  'registry key': 'registry_key',
  registry_key: 'registry_key',
  other: 'other',
};

export const parseIndicatorType = (raw: string | undefined, value: string): IndicatorType => {
  const key = (raw ?? '').trim().toLowerCase();
  return INDICATOR_TYPE_ALIASES[key] ?? inferIndicatorType(value);
};

/** Minimal RFC 4180 CSV parser (quotes, escaped quotes, CRLF). */
export const parseCsv = (input: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && input[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
};

export const toCsvCell = (value: unknown): string => {
  const s = value === null || value === undefined ? '' : String(value);
  return `"${s.replace(/"/g, '""')}"`;
};

export const clip = (value: string | null | undefined, max: number): string => {
  if (!value) return '';
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
};

export const encodeCursor = (sort: unknown[]): string =>
  Buffer.from(JSON.stringify(sort)).toString('base64url');

export const decodeCursor = (cursor: string): Array<string | number> => {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // fall through
  }
  throw Boom.badRequest('Invalid cursor');
};

export const plural = (n: number, one: string, many = `${one}s`): string =>
  `${n} ${n === 1 ? one : many}`;

/** Checks a value against its indicator type; returns a reason when it does not fit. */
export const validateIndicatorValue = (type: IndicatorType, value: string): string | null => {
  const v = value.trim();
  switch (type) {
    case 'ip':
      return IPV4.test(v) || IPV6.test(v) ? null : 'not a valid IP address';
    case 'domain':
      return DOMAIN.test(v) ? null : 'not a valid domain';
    case 'url':
      return URL_RE.test(v) && !/\s/.test(v) ? null : 'not a valid URL';
    case 'file_hash':
      return HASH.test(v) ? null : 'not an MD5, SHA-1, SHA-256 or SHA-512 hash';
    case 'email':
      return EMAIL.test(v) ? null : 'not a valid email address';
    default:
      return null;
  }
};
