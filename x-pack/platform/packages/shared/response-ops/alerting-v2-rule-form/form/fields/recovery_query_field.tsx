/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useFormContext, useWatch } from 'react-hook-form';
import { validateEsqlQuery } from '@kbn/alerting-v2-schemas';
import type { FormValues } from '../types';
import { useRuleFormServices } from '../contexts';
import { useRecoveryQueryValidation } from '../hooks/use_recovery_query_validation';
import { EsqlEditorField, EDITOR_HEIGHT_INLINE } from './esql_editor_field';

/**
 * ES|QL editor field for the recovery policy query.
 *
 * Displayed when the recovery type is set to `query`.
 * On mount, defaults to the current evaluation query so the user has a
 * reasonable starting point. Validates that:
 * 1. The input is a valid ES|QL query
 * 2. The query includes all fields specified in the rule's group key
 *    (required for the system to correctly match recovered results to alert instances)
 */
export const RecoveryQueryField: React.FC = () => {
  const { control, setValue, getValues } = useFormContext<FormValues>();
  const { data } = useRuleFormServices();
  const recoveryQuery = useWatch({ control, name: 'recoveryPolicy.query.base' });

  // Seed the recovery query with the evaluation query on mount when empty
  useEffect(() => {
    const currentRecoveryQuery = getValues('recoveryPolicy.query.base');
    if (!currentRecoveryQuery) {
      const evaluationQuery = getValues('evaluation.query.base');
      if (evaluationQuery) {
        setValue('recoveryPolicy.query.base', evaluationQuery);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { validationError: groupingValidationError } = useRecoveryQueryValidation({
    control,
    search: data.search.search,
    query: recoveryQuery ?? '',
  });

  const groupingErrors = groupingValidationError ? [new Error(groupingValidationError)] : undefined;

  return (
    <EsqlEditorField
      name="recoveryPolicy.query.base"
      label={i18n.translate('xpack.alertingV2.ruleForm.recoveryQueryLabel', {
        defaultMessage: 'Recovery condition',
      })}
      labelTooltip={i18n.translate('xpack.alertingV2.ruleForm.recoveryQueryTooltip', {
        defaultMessage:
          'Define an ES|QL query that determines when an alert should recover. The alert will recover when this query returns results.',
      })}
      height={EDITOR_HEIGHT_INLINE}
      dataTestSubj="recoveryQueryField"
      errors={groupingErrors}
      rules={{
        required: i18n.translate('xpack.alertingV2.ruleForm.recoveryQueryRequired', {
          defaultMessage: 'Recovery query is required when using a custom recovery condition.',
        }),
        validate: (value) => {
          if (!value) return true;
          const syntaxError = validateEsqlQuery(value);
          if (syntaxError) return syntaxError;
          // If grouping validation found missing columns, block submission
          if (groupingValidationError) return groupingValidationError;
          return true;
        },
      }}
    />
  );
};
