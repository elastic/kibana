/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InvalidEmailReason } from '@kbn/actions-plugin/common';
import type { ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ActionsPublicPluginSetup } from '@kbn/actions-plugin/public';
import { getInvalidEmailAddress, getNotAllowedEmailAddress } from '../translations';
import type { ScheduledReport } from '../../types';

export const getEmailsValidator =
  (
    validateEmailAddresses: ActionsPublicPluginSetup['validateEmailAddresses']
  ): ValidationFunc<ScheduledReport, string, string> =>
  ({ value, path }) => {
    const validatedEmails = validateEmailAddresses(Array.isArray(value) ? value : [value]);
    for (const validatedEmail of validatedEmails) {
      if (!validatedEmail.valid) {
        return {
          path,
          message:
            validatedEmail.reason === InvalidEmailReason.notAllowed
              ? getNotAllowedEmailAddress(value)
              : getInvalidEmailAddress(value),
        };
      }
    }
  };
