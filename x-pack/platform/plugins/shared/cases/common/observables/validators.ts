/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import ipaddr from 'ipaddr.js';
import { parseAddressList } from 'email-addresses';
import { isString } from 'lodash';

import {
  OBSERVABLE_TYPE_DOMAIN,
  OBSERVABLE_TYPE_EMAIL,
  OBSERVABLE_TYPE_IPV4,
  OBSERVABLE_TYPE_IPV6,
  OBSERVABLE_TYPE_URL,
} from '../constants';

const DOMAIN_REGEX = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)\.[A-Za-z]{2,}$/;
const GENERIC_REGEX = /^[a-zA-Z0-9._:/\\-]+$/;

export interface ValidationError {
  code: string;
}

export type SharedValidationFunction = (value: unknown) => ValidationError | undefined;

export const createStringValidationFunction =
  (stringValidator: (value: string) => ValidationError | undefined): SharedValidationFunction =>
  (value: unknown): ValidationError | undefined => {
    if (!isString(value)) {
      return { code: 'ERR_NOT_STRING' };
    }

    if (!value.length) {
      return { code: 'ERR_EMPTY' };
    }

    return stringValidator(value);
  };

export const validateDomain = createStringValidationFunction((value) => {
  return DOMAIN_REGEX.test(value) ? undefined : { code: 'ERR_NOT_VALID' };
});
export const validateGenericValue = createStringValidationFunction((value) => {
  return GENERIC_REGEX.test(value) ? undefined : { code: 'ERR_NOT_VALID' };
});

export const validateIp = (kind: 'ipv6' | 'ipv4') =>
  createStringValidationFunction((value: string) => {
    try {
      const parsed = ipaddr.parse(value);

      if (parsed.kind() !== kind) {
        return {
          code: 'ERR_NOT_VALID',
        };
      }
    } catch (error) {
      return {
        code: 'ERR_NOT_VALID',
      };
    }
  });

export const validateUrl = createStringValidationFunction((value) => {
  try {
    new URL(value);
  } catch (error) {
    return {
      code: 'ERR_NOT_VALID',
    };
  }
});

export const validateEmail = createStringValidationFunction((value: string) => {
  if (parseAddressList(value) === null) {
    return {
      code: 'ERR_NOT_EMAIL',
    };
  }
});

export const getValidatorForObservableType = (
  observableTypeKey: string | undefined
): SharedValidationFunction => {
  switch (observableTypeKey) {
    case OBSERVABLE_TYPE_URL.key: {
      return validateUrl;
    }

    case OBSERVABLE_TYPE_DOMAIN.key: {
      return validateDomain;
    }

    case OBSERVABLE_TYPE_EMAIL.key: {
      return validateEmail;
    }

    case OBSERVABLE_TYPE_IPV4.key: {
      return validateIp('ipv4');
    }

    case OBSERVABLE_TYPE_IPV6.key: {
      return validateIp('ipv6');
    }

    default: {
      return validateGenericValue;
    }
  }
};
