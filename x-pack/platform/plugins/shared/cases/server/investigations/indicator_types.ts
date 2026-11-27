/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesClient } from '../client';
import { getAvailableObservableTypes } from '../client/observable_types';
import { validateObservableValue } from '../client/validators';
import {
  OBSERVABLE_TYPE_DOMAIN,
  OBSERVABLE_TYPE_EMAIL,
  OBSERVABLE_TYPE_FILE_HASH,
  OBSERVABLE_TYPE_FILE_PATH,
  OBSERVABLE_TYPE_HOSTNAME,
  OBSERVABLE_TYPE_IPV4,
  OBSERVABLE_TYPE_IPV6,
  OBSERVABLE_TYPE_URL,
} from '../../common/constants/observables';
import { INVESTIGATIONS_OWNER } from '../../common/investigations/constants';
import {
  getIndicatorTypeLabel,
  getIndicatorTypeOptions,
  inferIndicatorTypeKey,
  matchIndicatorTypeKey,
} from '../../common/investigations/observable_types';
import type { IndicatorTypeOption } from '../../common/investigations/observable_types';

/** The Cases observable types for the investigations owner: built in plus the configured custom ones. */
export const getObservableTypes = async (
  casesClient: CasesClient
): Promise<IndicatorTypeOption[]> => {
  try {
    return getIndicatorTypeOptions(
      await getAvailableObservableTypes(casesClient, INVESTIGATIONS_OWNER)
    );
  } catch {
    return getIndicatorTypeOptions([]);
  }
};

export const getObservableTypeLabel = (
  types: readonly IndicatorTypeOption[],
  key: string
): string => getIndicatorTypeLabel(key, types);

/**
 * Resolves the Cases type key of an indicator (a key, a label or an old short name; inferred from
 * the value when no type is given) and checks the value with the Cases validators.
 */
export const resolveIndicatorForWrite = (
  types: readonly IndicatorTypeOption[],
  rawType: string | null | undefined,
  rawValue: string
): { type: string; error?: undefined } | { type?: undefined; error: string } => {
  const value = rawValue.trim();
  const hasType = (rawType ?? '').trim().length > 0;
  const type = hasType
    ? matchIndicatorTypeKey(rawType, value, types)
    : inferIndicatorTypeKey(value);
  if (!type) {
    return { error: `Invalid observable type, key does not exist: ${rawType}` };
  }
  try {
    validateObservableValue(type, value);
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
  return { type };
};

/** STIX 2.1 pattern for an indicator of a Cases type; `null` for types STIX has no object for. */
export const indicatorStixPattern = (type: string, rawValue: string): string | null => {
  const v = rawValue.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  switch (type) {
    case OBSERVABLE_TYPE_IPV4.key:
      return `[ipv4-addr:value = '${v}']`;
    case OBSERVABLE_TYPE_IPV6.key:
      return `[ipv6-addr:value = '${v}']`;
    case OBSERVABLE_TYPE_DOMAIN.key:
    case OBSERVABLE_TYPE_HOSTNAME.key:
      return `[domain-name:value = '${v}']`;
    case OBSERVABLE_TYPE_URL.key:
      return `[url:value = '${v}']`;
    case OBSERVABLE_TYPE_EMAIL.key:
      return `[email-addr:value = '${v}']`;
    case OBSERVABLE_TYPE_FILE_HASH.key:
      return rawValue.length === 64
        ? `[file:hashes.'SHA-256' = '${v}']`
        : rawValue.length === 40
        ? `[file:hashes.'SHA-1' = '${v}']`
        : rawValue.length === 128
        ? `[file:hashes.'SHA-512' = '${v}']`
        : `[file:hashes.MD5 = '${v}']`;
    case OBSERVABLE_TYPE_FILE_PATH.key:
      return `[file:name = '${(rawValue.split(/[\\/]/).pop() ?? rawValue).replace(/'/g, "\\'")}']`;
    default:
      return null;
  }
};
