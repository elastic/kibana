/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicatorType } from '../../../../common/investigations/types';
import * as i18n from './translations';

export const MAX_INDICATOR_LENGTH = 2048;

const IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
const IPV6 = /^(?:[0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i;
const DOMAIN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/i;
const HASH =
  /^(?:[a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{56}|[a-f0-9]{64}|[a-f0-9]{96}|[a-f0-9]{128})$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGISTRY_KEY = /^(?:HK[A-Z_]+|HKEY_[A-Z_]+)\\.+/i;
const URL_PROTOCOLS = ['http:', 'https:', 'ftp:', 'ftps:'];

const isUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return URL_PROTOCOLS.includes(parsed.protocol) && parsed.hostname.length > 0;
  } catch {
    return false;
  }
};

/** An error message when `value` is not a valid indicator of `type`, otherwise `undefined`. */
export const validateIndicatorValue = (
  type: IndicatorType,
  rawValue: string
): string | undefined => {
  const value = rawValue.trim();
  if (value.length === 0) {
    return i18n.INDICATOR_VALUE_REQUIRED;
  }
  if (value.length > MAX_INDICATOR_LENGTH) {
    return i18n.INDICATOR_VALUE_TOO_LONG(MAX_INDICATOR_LENGTH);
  }
  switch (type) {
    case 'ip':
      return IPV4.test(value) || IPV6.test(value) ? undefined : i18n.INDICATOR_INVALID_IP;
    case 'domain':
      return DOMAIN.test(value) ? undefined : i18n.INDICATOR_INVALID_DOMAIN;
    case 'url':
      return isUrl(value) ? undefined : i18n.INDICATOR_INVALID_URL;
    case 'file_hash':
      return HASH.test(value) ? undefined : i18n.INDICATOR_INVALID_HASH;
    case 'email':
      return EMAIL.test(value) ? undefined : i18n.INDICATOR_INVALID_EMAIL;
    case 'registry_key':
      return REGISTRY_KEY.test(value) ? undefined : i18n.INDICATOR_INVALID_REGISTRY_KEY;
    default:
      return undefined;
  }
};

/** An example value to show as the placeholder for each type. */
export const INDICATOR_PLACEHOLDERS: Record<IndicatorType, string> = {
  ip: '198.51.100.7',
  domain: 'update.example.com',
  url: 'https://example.com/payload.bin',
  file_hash: '9f2c4be71d0a6e83b5c2f19d7a40e6c8d35b1f72a9e04c6d8b7f3a21e5c0a1e4',
  file_path: 'C:\\Users\\svc-build\\AppData\\Local\\Temp\\upd.dll',
  email: 'billing@example.com',
  registry_key: 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\Updater',
  other: 'Any other observable',
};
