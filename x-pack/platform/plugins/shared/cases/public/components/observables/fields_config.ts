/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { parseAddressList } from 'email-addresses';
import ipaddr from 'ipaddr.js';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';

import {
  OBSERVABLE_TYPE_DOMAIN,
  OBSERVABLE_TYPE_EMAIL,
  OBSERVABLE_TYPE_IPV4,
  OBSERVABLE_TYPE_IPV6,
  OBSERVABLE_TYPE_URL,
} from '../../../common/constants';
import * as i18n from './translations';

export const normalizeValueType = (value: string): keyof typeof fieldsConfig.value | 'generic' => {
  if (value in fieldsConfig.value) {
    return value as keyof typeof fieldsConfig.value;
  }

  return 'generic';
};

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

const notStringError = (path: string) => ({
  code: 'ERR_NOT_STRING',
  message: 'Value should be a string',
  path,
});

const { emptyField } = fieldValidators;

const validatorFactory =
  (
    regex: RegExp,
    message: string = i18n.INVALID_VALUE,
    code: string = 'ERR_NOT_VALID'
  ): ValidationFunc =>
  (...args: Parameters<ValidationFunc>) => {
    const [{ value, path }] = args;

    if (typeof value !== 'string') {
      return notStringError(path);
    }

    if (!regex.test(value)) {
      return {
        code,
        message,
        path,
      };
    }
  };

export const genericValidator = validatorFactory(GENERIC_REGEX);
export const domainValidator = validatorFactory(DOMAIN_REGEX);

const ipValidatorFactory =
  (kind: 'ipv6' | 'ipv4') =>
  (...args: Parameters<ValidationFunc>) => {
    const [{ value, path }] = args;

    if (typeof value !== 'string') {
      return notStringError(path);
    }

    try {
      const parsed = ipaddr.parse(value);

      if (parsed.kind() !== kind) {
        return {
          code: 'ERR_NOT_VALID',
          message: i18n.INVALID_VALUE,
          path,
        };
      }
    } catch (error) {
      return {
        code: 'ERR_NOT_VALID',
        message: i18n.INVALID_VALUE,
        path,
      };
    }
  };

export const ipv6Validator = ipValidatorFactory('ipv6');
export const ipv4Validator = ipValidatorFactory('ipv4');

export const urlValidator = (...args: Parameters<ValidationFunc>) => {
  const [{ value, path }] = args;

  if (typeof value !== 'string') {
    return notStringError(path);
  }

  try {
    new URL(value);
  } catch (error) {
    return {
      code: 'ERR_NOT_VALID',
      message: i18n.INVALID_VALUE,
      path,
    };
  }
};

export const emailValidator = (...args: Parameters<ValidationFunc>) => {
  const [{ value, path }] = args;

  if (typeof value !== 'string') {
    return notStringError(path);
  }

  const emailAddresses = parseAddressList(value);

  if (emailAddresses == null) {
    return { message: i18n.INVALID_EMAIL, code: 'ERR_NOT_EMAIL', path };
  }
};

export const fieldsConfig = {
  value: {
    generic: {
      validations: [
        {
          validator: emptyField(i18n.REQUIRED_VALUE),
        },
        {
          validator: genericValidator,
        },
      ],
      label: i18n.FIELD_LABEL_VALUE,
    },
    [OBSERVABLE_TYPE_EMAIL.key]: {
      validations: [
        {
          validator: emptyField(i18n.REQUIRED_VALUE),
        },
        {
          validator: emailValidator,
        },
      ],
      label: 'Email',
    },
    [OBSERVABLE_TYPE_DOMAIN.key]: {
      validations: [
        {
          validator: emptyField(i18n.REQUIRED_VALUE),
        },
        {
          validator: domainValidator,
        },
      ],
      label: 'Domain',
    },
    [OBSERVABLE_TYPE_IPV4.key]: {
      validations: [
        {
          validator: emptyField(i18n.REQUIRED_VALUE),
        },
        {
          validator: ipv4Validator,
        },
      ],
      label: 'IPv4',
    },
    [OBSERVABLE_TYPE_IPV6.key]: {
      validations: [
        {
          validator: emptyField(i18n.REQUIRED_VALUE),
        },
        {
          validator: ipv6Validator,
        },
      ],
      label: 'IPv6',
    },
    [OBSERVABLE_TYPE_URL.key]: {
      validations: [
        {
          validator: emptyField(i18n.REQUIRED_VALUE),
        },
        {
          validator: urlValidator,
        },
      ],
      label: 'URL',
    },
  },
  typeKey: {
    validations: [
      {
        validator: emptyField(i18n.REQUIRED_VALUE),
      },
    ],
    label: i18n.FIELD_LABEL_TYPE,
  },
  description: {
    label: i18n.FIELD_LABEL_DESCRIPTION,
  },
};
