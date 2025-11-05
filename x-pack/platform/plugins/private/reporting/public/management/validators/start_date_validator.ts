/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Moment } from 'moment';
import { ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { SCHEDULED_REPORT_FORM_START_DATE_TOO_EARLY_MESSAGE } from '../translations';
import { ScheduledReport } from '../../types';

export const getStartDateValidator =
  (today: Moment, timezone: string): ValidationFunc<Partial<ScheduledReport>, string, Moment> =>
  ({ value }) => {
    const valueInTimezone = value.clone().tz(timezone, true);
    if (valueInTimezone.isBefore(today)) {
      return {
        message: SCHEDULED_REPORT_FORM_START_DATE_TOO_EARLY_MESSAGE,
      };
    }
  };
