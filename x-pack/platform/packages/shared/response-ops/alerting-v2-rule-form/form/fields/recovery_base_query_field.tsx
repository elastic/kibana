/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EsqlEditorField, EDITOR_HEIGHT_INLINE } from './esql_editor_field';

const DEFAULT_TOOLTIP = i18n.translate('xpack.alertingV2.ruleForm.recoveryQueryTooltip', {
  defaultMessage:
    'Define an ES|QL query that determines when an alert should recover. The alert will recover when this query returns results.',
});

interface RecoveryBaseQueryFieldProps {
  /** Override the default tooltip text. */
  labelTooltip?: string;
  /** Custom data-test-subj. Default: 'recoveryQueryField'. */
  dataTestSubj?: string;
  /** Validation rules provided by the parent (from useRecoveryValidation hook). */
  rules?: {
    required?: string;
    validate?: (value: string | null | undefined) => string | boolean | Promise<string | boolean>;
  };
  /** Errors to display in the editor (e.g., grouping validation errors). */
  errors?: Error[];
}

/**
 * Presentational ES|QL editor field for the recovery policy query.
 *
 * This is a thin wrapper around `EsqlEditorField` with recovery-specific labels.
 * All validation logic (syntax, grouping, differs-from-evaluation) is provided
 * externally via the `rules` and `errors` props from the `useRecoveryValidation` hook.
 */
export const RecoveryBaseQueryField = ({
  labelTooltip = DEFAULT_TOOLTIP,
  dataTestSubj = 'recoveryQueryField',
  rules,
  errors,
}: RecoveryBaseQueryFieldProps) => {
  return (
    <EsqlEditorField
      name="recoveryPolicy.query.base"
      label={i18n.translate('xpack.alertingV2.ruleForm.recoveryQueryLabel', {
        defaultMessage: 'Recovery query',
      })}
      labelTooltip={labelTooltip}
      height={EDITOR_HEIGHT_INLINE}
      dataTestSubj={dataTestSubj}
      errors={errors}
      rules={rules}
    />
  );
};
