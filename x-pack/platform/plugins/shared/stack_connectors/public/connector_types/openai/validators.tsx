/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ValidationError,
  ValidationFunc,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { ERROR_CODE } from '@kbn/es-ui-shared-plugin/static/forms/helpers/field_validators/types';

const protocolAndDomainRE = /^(?:\w+:)?\/\/(\S+)$/;
const localhostDomainRE = /^localhost[\:?\d]*(?:[^\:?\d]\S*)?$/;
const nonLocalhostDomainRE = /^[^\s\.]+(?:\.\S{2,})?$/;

export const validateURL =
  (message: string) =>
  (...args: Parameters<ValidationFunc>): ValidationError<ERROR_CODE> | undefined => {
    const [{ value }] = args;

    const error: ValidationError<ERROR_CODE> = {
      code: 'ERR_FIELD_FORMAT',
      formatType: 'URL',
      message,
    };

    if (typeof value !== 'string') {
      return error;
    }

    const match = value.match(protocolAndDomainRE);
    if (!match) {
      return error;
    }

    const everythingAfterProtocol = match[1];
    if (!everythingAfterProtocol) {
      return error;
    }

    if (
      localhostDomainRE.test(everythingAfterProtocol) ||
      nonLocalhostDomainRE.test(everythingAfterProtocol)
    ) {
      return;
    }

    return error;
  };
