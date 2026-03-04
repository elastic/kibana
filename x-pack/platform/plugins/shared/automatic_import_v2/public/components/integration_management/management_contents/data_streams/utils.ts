/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTokenProps } from '@elastic/eui';
import ipaddr from 'ipaddr.js';

const TYPE_TO_ICON_MAP: Record<string, EuiTokenProps['iconType']> = {
  string: 'tokenString',
  keyword: 'tokenKeyword',
  number: 'tokenNumber',
  long: 'tokenNumber',
  float: 'tokenNumber',
  date: 'tokenDate',
  ip: 'tokenIP',
  geo_point: 'tokenGeo',
  object: 'tokenQuestion',
  nested: 'tokenNested',
  boolean: 'tokenBoolean',
} as const;

export const getIconFromType = (type: string | null | undefined): EuiTokenProps['iconType'] => {
  if (!type) return 'tokenQuestion';
  return TYPE_TO_ICON_MAP[type] ?? 'tokenQuestion';
};

export const isValidIp = (value: string): boolean => {
  try {
    return ipaddr.IPv4.isValidFourPartDecimal(value) || ipaddr.IPv6.isValid(value);
  } catch {
    return false;
  }
};

export const getFieldType = (value: unknown): string => {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return Number.isInteger(value) ? 'long' : 'float';
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) return 'nested';
  if (typeof value === 'object') return 'object';
  if (typeof value === 'string') {
    const looksLikeIPv4 = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value);
    const looksLikeIPv6 = /^[0-9a-fA-F:]+$/.test(value);
    if (looksLikeIPv4 || looksLikeIPv6) {
      if (isValidIp(value)) {
        return 'ip';
      }
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
  }
  return 'string';
};

export const flattenPipelineObject = (
  obj: Record<string, unknown>,
  parentKey = ''
): Array<{ field: string; value: string; type: string }> => {
  const result: Array<{ field: string; value: string; type: string }> = [];

  for (const [key, value] of Object.entries(obj)) {
    const fieldName = parentKey ? `${parentKey}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result.push(...flattenPipelineObject(value as Record<string, unknown>, fieldName));
    } else {
      result.push({
        field: fieldName,
        value: Array.isArray(value) ? JSON.stringify(value) : String(value ?? ''),
        type: getFieldType(value),
      });
    }
  }

  return result;
};
