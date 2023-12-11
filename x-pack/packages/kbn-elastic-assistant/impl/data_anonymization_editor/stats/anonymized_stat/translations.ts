/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ANONYMIZED_FIELDS = i18n.translate(
  'xpack.elasticAssistant.dataAnonymizationEditor.stats.anonymizedStat.anonymizeFieldsdDescription',
  {
    defaultMessage: 'Anonymized',
  }
);

export const FIELDS_WILL_BE_ANONYMIZED = (anonymized: number) =>
  i18n.translate(
    'xpack.elasticAssistant.dataAnonymizationEditor.stats.anonymizedStat.fieldsWillBeAnonymizedTooltip',
    {
      values: { anonymized },
      defaultMessage:
        '{anonymized} {anonymized, plural, =1 {field} other {fields}} in this context will be replaced with random values. Responses are automatically translated back to the original values.',
    }
  );

export const NONE_OF_THE_DATA_WILL_BE_ANONYMIZED = (isDataAnonymizable: boolean) =>
  i18n.translate(
    'xpack.elasticAssistant.dataAnonymizationEditor.stats.anonymizedStat.noneOfTheDataWillBeAnonymizedTooltip',
    {
      values: { isDataAnonymizable },
      defaultMessage:
        '{isDataAnonymizable, select, true {Select fields to be replaced with random values. Responses are automatically translated back to the original values.} other {This context cannot be anonymized}}',
    }
  );
