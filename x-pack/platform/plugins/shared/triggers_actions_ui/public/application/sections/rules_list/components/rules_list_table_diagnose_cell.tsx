/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import type { RuleTableItem } from '../../../../types';
import { diagnoseRule } from '../../../../common/lib/rule_diagnostics';

export interface RulesListTableDiagnoseCellProps {
  rule: RuleTableItem;
  onDiagnoseClick: (rule: RuleTableItem) => void;
}

const DIAGNOSE_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.rulesListTable.diagnoseButtonLabel',
  { defaultMessage: 'Diagnose' }
);

export const RulesListTableDiagnoseCell = ({
  rule,
  onDiagnoseClick,
}: RulesListTableDiagnoseCellProps) => {
  const diagnoses = diagnoseRule(rule);
  if (diagnoses.length === 0) {
    return null;
  }

  const color = diagnoses.some(({ severity }) => severity === 'danger') ? 'danger' : 'warning';

  return (
    <EuiToolTip content={DIAGNOSE_LABEL} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="inspect"
        color={color}
        aria-label={DIAGNOSE_LABEL}
        data-test-subj="ruleDiagnoseButton"
        onClick={() => onDiagnoseClick(rule)}
      />
    </EuiToolTip>
  );
};
