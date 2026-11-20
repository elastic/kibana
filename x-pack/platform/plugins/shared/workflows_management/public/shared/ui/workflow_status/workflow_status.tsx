/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type EuiBadgeProps, EuiIconTip, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

type WorkflowStatusProps = EuiBadgeProps & {
  valid: boolean;
};

export function WorkflowStatus({ valid, ...props }: WorkflowStatusProps) {
  const { euiTheme } = useEuiTheme();
  if (valid) return null;
  return (
    <EuiIconTip
      type="errorFill"
      color={euiTheme.colors.danger}
      size="m"
      content={i18n.translate('workflows.workflowList.workflowInvalid', {
        defaultMessage:
          'This workflow can’t be enabled because it contains validation errors. Please review and fix them before continuing.',
      })}
    />
  );
}
