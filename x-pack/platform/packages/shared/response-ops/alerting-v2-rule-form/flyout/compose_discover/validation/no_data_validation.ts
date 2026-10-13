/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isAbsenceDistinguishableFromBreach } from '@kbn/alerting-v2-schemas';
import type { FormValues } from '../../../form/types';
import { ruleQueryToApiQuery } from '../../../form/utils/query_mappers';
import { formNoDataToApiNoData } from '../../../form/utils/lifecycle_mappers';

const NO_DATA_NEEDS_ALERT_CONDITION_ERROR = i18n.translate(
  'xpack.alertingV2.composeDiscover.validation.noDataNeedsAlertConditionError',
  {
    defaultMessage:
      'Without an alert condition, a group that stops breaching looks the same as one with no data. Move the breach filter into the alert condition, or set no data behavior to "Do nothing".',
  }
);

/**
 * RHF `rules.validate` for `noData`. Mirrors the write API's rule that a rule
 * classifying absence has to say what presence means.
 */
export const validateNoDataStrategy = (
  values: Pick<FormValues, 'kind' | 'noData' | 'query'>
): true | string =>
  isAbsenceDistinguishableFromBreach({
    query: ruleQueryToApiQuery(values.query),
    no_data: formNoDataToApiNoData(values),
  })
    ? true
    : NO_DATA_NEEDS_ALERT_CONDITION_ERROR;
