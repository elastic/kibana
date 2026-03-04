/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { useFormContext, useWatch } from 'react-hook-form';
import { validateEsqlQuery } from '@kbn/alerting-v2-schemas';
import type { FormValues } from '../types';
import { useRuleFormServices } from '../contexts';
import { useRecoveryQueryValidation } from '../hooks/use_recovery_query_validation';
import { EsqlEditorField, EDITOR_HEIGHT_INLINE } from './esql_editor_field';

const DEFAULT_TOOLTIP = i18n.translate('xpack.alertingV2.ruleForm.recoveryQueryTooltip', {
  defaultMessage:
    'Define an ES|QL query that determines when an alert should recover. The alert will recover when this query returns results.',
});

interface RecoveryBaseQueryFieldProps {
  /** Override the default tooltip text. */
  labelTooltip?: string;
  /** Whether the field is required. Default: true. */
  required?: boolean;
  /** Whether to seed from evaluation query on mount. Default: true. */
  seedFromEvaluation?: boolean;
  /** Whether to validate grouping fields internally. Default: true.
   *  Set to false when the parent handles grouping validation on an assembled query. */
  validateGrouping?: boolean;
  /** Custom data-test-subj. Default: 'recoveryQueryField'. */
  dataTestSubj?: string;
  /** Additional validation function supplied by the parent.
   *  Runs after built-in syntax and grouping checks. Return a string to signal an error,
   *  or `true` / `undefined` to pass. */
  additionalValidation?: (value: string | undefined) => string | true | undefined;
}

/**
 * ES|QL editor field for the recovery policy query.
 *
 * Displayed when the recovery type is set to `query`.
 * On mount, defaults to the current evaluation query so the user has a
 * reasonable starting point. Validates that:
 * 1. The input is a valid ES|QL query
 * 2. The query includes all fields specified in the rule's group key
 *    (required for the system to correctly match recovered results to alert instances)
 *
 * Both behaviors are configurable via props for reuse in split mode
 * (where the parent handles seeding and grouping validation on the assembled query).
 */
export const RecoveryBaseQueryField: React.FC<RecoveryBaseQueryFieldProps> = ({
  labelTooltip = DEFAULT_TOOLTIP,
  required = true,
  seedFromEvaluation = true,
  validateGrouping = true,
  dataTestSubj = 'recoveryQueryField',
  additionalValidation,
}) => {
  const { control, setValue, getValues } = useFormContext<FormValues>();
  const { data } = useRuleFormServices();
  const recoveryQuery = useWatch({ control, name: 'recoveryPolicy.query.base' });

  // Seed the recovery query with the evaluation query on mount when empty
  const hasSeeded = useRef(false);
  useEffect(() => {
    if (!seedFromEvaluation || hasSeeded.current) return;
    hasSeeded.current = true;
    const currentRecoveryQuery = getValues('recoveryPolicy.query.base');
    if (!currentRecoveryQuery) {
      const evaluationQuery = getValues('evaluation.query.base');
      if (evaluationQuery) {
        setValue('recoveryPolicy.query.base', evaluationQuery);
      }
    }
  }, [seedFromEvaluation, getValues, setValue]);

  const { validationError: groupingValidationError } = useRecoveryQueryValidation({
    control,
    search: data.search.search,
    query: validateGrouping ? recoveryQuery ?? '' : '',
  });

  const groupingErrors =
    validateGrouping && groupingValidationError ? [new Error(groupingValidationError)] : undefined;

  return (
    <EsqlEditorField
      name="recoveryPolicy.query.base"
      label={i18n.translate('xpack.alertingV2.ruleForm.recoveryQueryLabel', {
        defaultMessage: 'Recovery query',
      })}
      labelTooltip={labelTooltip}
      height={EDITOR_HEIGHT_INLINE}
      dataTestSubj={dataTestSubj}
      errors={groupingErrors}
      rules={{
        ...(required
          ? {
              required: i18n.translate('xpack.alertingV2.ruleForm.recoveryQueryRequired', {
                defaultMessage:
                  'Recovery query is required when using a custom recovery condition.',
              }),
            }
          : {}),
        validate: (value) => {
          if (!value) return true;
          const syntaxError = validateEsqlQuery(value);
          if (syntaxError) return syntaxError;
          if (validateGrouping && groupingValidationError) return groupingValidationError;
          if (additionalValidation) {
            const additionalError = additionalValidation(value);
            if (additionalError && additionalError !== true) return additionalError;
          }
          return true;
        },
      }}
    />
  );
};
