/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OBSERVABLE_TYPE_DOMAIN,
  OBSERVABLE_TYPE_EMAIL,
  OBSERVABLE_TYPE_FILE_HASH,
  OBSERVABLE_TYPE_FILE_PATH,
  OBSERVABLE_TYPE_HOSTNAME,
  OBSERVABLE_TYPE_IPV4,
  OBSERVABLE_TYPE_IPV6,
  OBSERVABLE_TYPE_URL,
} from '../../../../common/constants/observables';
import { getValidatorForObservableType } from '../../../../common/observables/validators';
import * as observableI18n from '../../../components/observables/translations';
import type { IndicatorType } from '../../../../common/investigations/types';
import * as i18n from './translations';

export const MAX_INDICATOR_LENGTH = 2048;

/** An error message when `value` is not valid for the Cases observable type `type`, otherwise `undefined`. */
export const validateIndicatorValue = (
  type: IndicatorType,
  rawValue: string
): string | undefined => {
  const value = rawValue.trim();
  if (value.length === 0) {
    return observableI18n.REQUIRED_VALUE;
  }
  if (value.length > MAX_INDICATOR_LENGTH) {
    return i18n.INDICATOR_VALUE_TOO_LONG(MAX_INDICATOR_LENGTH);
  }
  const error = getValidatorForObservableType(type)(value);
  if (!error) {
    return undefined;
  }
  return error.code === 'ERR_NOT_EMAIL'
    ? observableI18n.INVALID_EMAIL
    : observableI18n.INVALID_VALUE;
};

/** An example value to show as the placeholder for a Cases observable type. */
export const getIndicatorPlaceholder = (type: IndicatorType): string => {
  switch (type) {
    case OBSERVABLE_TYPE_IPV4.key:
      return '198.51.100.7';
    case OBSERVABLE_TYPE_IPV6.key:
      return '2001:db8::7';
    case OBSERVABLE_TYPE_DOMAIN.key:
      return 'update.example.com';
    case OBSERVABLE_TYPE_HOSTNAME.key:
      return 'ws-0142';
    case OBSERVABLE_TYPE_URL.key:
      return 'https://example.com/payload.bin';
    case OBSERVABLE_TYPE_FILE_HASH.key:
      return '9f2c4be71d0a6e83b5c2f19d7a40e6c8d35b1f72a9e04c6d8b7f3a21e5c0a1e4';
    case OBSERVABLE_TYPE_FILE_PATH.key:
      return 'C:\\Users\\svc-build\\AppData\\Local\\Temp\\upd.dll';
    case OBSERVABLE_TYPE_EMAIL.key:
      return 'billing@example.com';
    default:
      return i18n.INDICATOR_OTHER_EXAMPLE;
  }
};
