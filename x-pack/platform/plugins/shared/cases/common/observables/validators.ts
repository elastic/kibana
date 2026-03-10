/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import ipaddr from 'ipaddr.js';
import { parseAddressList } from 'email-addresses';
import isString from 'lodash/isString';

import {
  OBSERVABLE_TYPE_DOMAIN,
  OBSERVABLE_TYPE_EMAIL,
  OBSERVABLE_TYPE_IPV4,
  OBSERVABLE_TYPE_IPV6,
  OBSERVABLE_TYPE_URL,
} from '../constants';

/**
 * DOMAIN REGEX breakdown:
 *
 * (?=.{1,253}$)
 *    Ensures the total length of the domain name is between 1 and 253 characters.
 *
 * ((?!.*--)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)\.)+
 *    Matches one or more labels separated by dots. Each label:
 *      - Begins and ends with an alphanumeric character (`[a-zA-Z0-9]`).
 *      - Can contain hyphens (`-`) but not consecutively or at the start/end.
 *      - Has a maximum length of 63 characters.
 *
 * [a-zA-Z]{2,63}
 *    Ensures the top-level domain (TLD) is alphabetic and between 2 and 63 characters long
 *
 * \.?$
 *    Matched domains ending with dot (.) as they are valid domains
 *    @see https://datatracker.ietf.org/doc/html/rfc1034#:~:text=When%20a%20user,ISI.EDU%20domain
 */
const DOMAIN_REGEX =
  /^(?=.{1,253}$)((?!.*--)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)\.)+[a-zA-Z]{2,63}\.?$/;
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
