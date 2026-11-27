/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import Boom from '@hapi/boom';
import type { InvestigationPriority } from '../../common/investigations/types';

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
