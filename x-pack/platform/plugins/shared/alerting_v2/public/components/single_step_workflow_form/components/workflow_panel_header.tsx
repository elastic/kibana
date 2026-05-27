/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface WorkflowPanelHeaderProps {
  iconType: string;
  title: string;
  onBack: () => void;
}

export const WorkflowPanelHeader = ({ iconType, title, onBack }: WorkflowPanelHeaderProps) => (
  <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={iconType} size="l" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{title}</h3>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiLink onClick={onBack} data-test-subj="singleStepWorkflowBackLink">
        {i18n.translate('xpack.alertingV2.singleStepWorkflow.panelHeader.back', {
          defaultMessage: 'Change action type',
        })}
      </EuiLink>
    </EuiFlexItem>
  </EuiFlexGroup>
);
