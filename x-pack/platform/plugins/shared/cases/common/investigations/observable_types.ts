/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OBSERVABLE_TYPES_BUILTIN,
  OBSERVABLE_TYPE_DOMAIN,
  OBSERVABLE_TYPE_EMAIL,
  OBSERVABLE_TYPE_FILE_HASH,
  OBSERVABLE_TYPE_FILE_PATH,
  OBSERVABLE_TYPE_HOSTNAME,
  OBSERVABLE_TYPE_IPV4,
  OBSERVABLE_TYPE_IPV6,
  OBSERVABLE_TYPE_URL,
} from '../constants/observables';
import {
  getValidatorForObservableType,
  validateEmail,
  validateIp,
  validateUrl,
} from '../observables/validators';

/** An observable type as Cases defines it: a stable key and a label. */
export interface IndicatorTypeOption {
  key: string;
  label: string;
}

/** Short names the POC used before indicator types became Cases observable type keys. */
export const INDICATOR_TYPE_ALIASES: Readonly<Record<string, string>> = {
  ip: OBSERVABLE_TYPE_IPV4.key,
  'ip address': OBSERVABLE_TYPE_IPV4.key,
  ipv4: OBSERVABLE_TYPE_IPV4.key,
  ipv6: OBSERVABLE_TYPE_IPV6.key,
  domain: OBSERVABLE_TYPE_DOMAIN.key,
  hostname: OBSERVABLE_TYPE_HOSTNAME.key,
  host: OBSERVABLE_TYPE_HOSTNAME.key,
  url: OBSERVABLE_TYPE_URL.key,
  hash: OBSERVABLE_TYPE_FILE_HASH.key,
  file_hash: OBSERVABLE_TYPE_FILE_HASH.key,
  'file hash': OBSERVABLE_TYPE_FILE_HASH.key,
  sha256: OBSERVABLE_TYPE_FILE_HASH.key,
  sha1: OBSERVABLE_TYPE_FILE_HASH.key,
  md5: OBSERVABLE_TYPE_FILE_HASH.key,
  file_path: OBSERVABLE_TYPE_FILE_PATH.key,
  'file path': OBSERVABLE_TYPE_FILE_PATH.key,
  path: OBSERVABLE_TYPE_FILE_PATH.key,
  registry_key: OBSERVABLE_TYPE_FILE_PATH.key,
  'registry key': OBSERVABLE_TYPE_FILE_PATH.key,
  email: OBSERVABLE_TYPE_EMAIL.key,
  'email address': OBSERVABLE_TYPE_EMAIL.key,
};

/** The old short names an agent or script may still send (an alias or `other`). */
export const INDICATOR_TYPE_ALIAS_NAMES: readonly string[] = [
  ...Object.keys(INDICATOR_TYPE_ALIASES).filter((name) => !name.includes(' ')),
  'other',
];

const HASH =
  /^(?:[a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{56}|[a-f0-9]{64}|[a-f0-9]{96}|[a-f0-9]{128})$/i;
const WINDOWS_PATH = /^(?:[a-z]:\\|\\\\|HK(?:LM|CU|CR|U|CC)\\|HKEY_)/i;

/** The Cases built-in observable types followed by the custom ones from the Cases configuration. */
export const getIndicatorTypeOptions = (
  customTypes: readonly IndicatorTypeOption[] = []
): IndicatorTypeOption[] => {
  const builtinKeys = new Set(OBSERVABLE_TYPES_BUILTIN.map(({ key }) => key));
  return [
    ...OBSERVABLE_TYPES_BUILTIN,
    ...customTypes.filter(({ key }) => !builtinKeys.has(key)),
  ].map(({ key, label }) => ({ key, label }));
};

/** The label Cases shows for a type key; the key itself when the type is unknown. */
export const getIndicatorTypeLabel = (
  key: string,
  customTypes: readonly IndicatorTypeOption[] = []
): string =>
  getIndicatorTypeOptions(customTypes).find((option) => option.key === key)?.label ?? key;

/** Best-effort Cases type key for a value, using the Cases validators; hostname when nothing fits. */
export const inferIndicatorTypeKey = (rawValue: string): string => {
  const value = rawValue.trim();
  if (!validateIp('ipv4')(value)) return OBSERVABLE_TYPE_IPV4.key;
  if (!validateIp('ipv6')(value)) return OBSERVABLE_TYPE_IPV6.key;
  if (HASH.test(value)) return OBSERVABLE_TYPE_FILE_HASH.key;
  if (!validateEmail(value)) return OBSERVABLE_TYPE_EMAIL.key;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value) && !validateUrl(value)) return OBSERVABLE_TYPE_URL.key;
  if (WINDOWS_PATH.test(value) || value.startsWith('/')) return OBSERVABLE_TYPE_FILE_PATH.key;
  const domainValidator = getValidatorForObservableType(OBSERVABLE_TYPE_DOMAIN.key);
  if (!domainValidator(value)) return OBSERVABLE_TYPE_DOMAIN.key;
  return OBSERVABLE_TYPE_HOSTNAME.key;
};

/**
 * The Cases type key a requested type stands for: a key, a label, or an old short name.
 * `undefined` when it names no known type. `ip` follows the value (IPv4 or IPv6) and `other` is inferred.
 */
export const matchIndicatorTypeKey = (
  rawType: string | null | undefined,
  value: string,
  customTypes: readonly IndicatorTypeOption[] = []
): string | undefined => {
  const raw = (rawType ?? '').trim();
  if (!raw) return undefined;
  const options = getIndicatorTypeOptions(customTypes);
  const lower = raw.toLowerCase();
  const exact =
    options.find(({ key }) => key === raw) ??
    options.find(({ label }) => label.toLowerCase() === lower);
  if (exact) return exact.key;
  if (lower === 'other') return inferIndicatorTypeKey(value);
  if (lower === 'ip' || lower === 'ip address') {
    return value.includes(':') ? OBSERVABLE_TYPE_IPV6.key : OBSERVABLE_TYPE_IPV4.key;
  }
  return INDICATOR_TYPE_ALIASES[lower];
};

/** Same as {@link matchIndicatorTypeKey}, falling back to the type the value looks like. */
export const resolveIndicatorTypeKey = (
  rawType: string | null | undefined,
  value: string,
  customTypes: readonly IndicatorTypeOption[] = []
): string => matchIndicatorTypeKey(rawType, value, customTypes) ?? inferIndicatorTypeKey(value);

/** Type keys a filter on `type` stands for (an old short name may cover more than one key). */
export const expandIndicatorTypeFilter = (types: readonly string[]): string[] => {
  const out = new Set<string>();
  for (const type of types) {
    out.add(type);
    const lower = type.toLowerCase();
    if (lower === 'ip' || lower === 'ip address') {
      out.add(OBSERVABLE_TYPE_IPV4.key);
      out.add(OBSERVABLE_TYPE_IPV6.key);
    } else if (INDICATOR_TYPE_ALIASES[lower]) {
      out.add(INDICATOR_TYPE_ALIASES[lower]);
    }
  }
  return Array.from(out);
};
