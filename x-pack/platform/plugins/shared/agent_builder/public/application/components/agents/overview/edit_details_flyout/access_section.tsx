/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { AgentAccessControlScope, ACCESS_CONTROL_SCOPE_ICON } from '@kbn/agent-builder-common';
import { Controller, useFormContext } from 'react-hook-form';
import { labels } from '../../../../utils/i18n';
import {
  ACCESS_CONTROL_SCOPE_LABELS,
  ACCESS_CONTROL_SCOPE_TOOLTIPS,
} from '../../../../utils/access_control_scope_i18n';
import type { EditDetailsFormData } from './types';

const { editDetails: flyoutLabels } = labels.agentOverview;

interface AccessSectionProps {
  canChangeAccessControlScope: boolean;
}

const renderAccessControlScopeOption = ({ icon, label }: { icon: IconType; label: string }) => (
  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiIcon type={icon} aria-hidden={true} />
    </EuiFlexItem>
    <EuiFlexItem>{label}</EuiFlexItem>
  </EuiFlexGroup>
);

const accessControlScopeOptions = [
  {
    value: AgentAccessControlScope.Private,
    inputDisplay: renderAccessControlScopeOption({
      icon: ACCESS_CONTROL_SCOPE_ICON[AgentAccessControlScope.Private],
      label: ACCESS_CONTROL_SCOPE_LABELS[AgentAccessControlScope.Private],
    }),
    dropdownDisplay: (
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
        <EuiFlexItem>
          {renderAccessControlScopeOption({
            icon: ACCESS_CONTROL_SCOPE_ICON[AgentAccessControlScope.Private],
            label: ACCESS_CONTROL_SCOPE_LABELS[AgentAccessControlScope.Private],
          })}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {ACCESS_CONTROL_SCOPE_TOOLTIPS[AgentAccessControlScope.Private]}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
  {
    value: AgentAccessControlScope.Shared,
    inputDisplay: renderAccessControlScopeOption({
      icon: ACCESS_CONTROL_SCOPE_ICON[AgentAccessControlScope.Shared],
      label: ACCESS_CONTROL_SCOPE_LABELS[AgentAccessControlScope.Shared],
    }),
    dropdownDisplay: (
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
        <EuiFlexItem>
          {renderAccessControlScopeOption({
            icon: ACCESS_CONTROL_SCOPE_ICON[AgentAccessControlScope.Shared],
            label: ACCESS_CONTROL_SCOPE_LABELS[AgentAccessControlScope.Shared],
          })}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {ACCESS_CONTROL_SCOPE_TOOLTIPS[AgentAccessControlScope.Shared]}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
  {
    value: AgentAccessControlScope.Public,
    inputDisplay: renderAccessControlScopeOption({
      icon: ACCESS_CONTROL_SCOPE_ICON[AgentAccessControlScope.Public],
      label: ACCESS_CONTROL_SCOPE_LABELS[AgentAccessControlScope.Public],
    }),
    dropdownDisplay: (
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
        <EuiFlexItem>
          {renderAccessControlScopeOption({
            icon: ACCESS_CONTROL_SCOPE_ICON[AgentAccessControlScope.Public],
            label: ACCESS_CONTROL_SCOPE_LABELS[AgentAccessControlScope.Public],
          })}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {ACCESS_CONTROL_SCOPE_TOOLTIPS[AgentAccessControlScope.Public]}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
];

export const AccessSection: React.FC<AccessSectionProps> = ({ canChangeAccessControlScope }) => {
  const { control, formState } = useFormContext<EditDetailsFormData>();

  return (
    <>
      <EuiTitle size="xs">
        <h3>{flyoutLabels.accessTitle}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued" component="p">
        {flyoutLabels.accessDescription}
      </EuiText>
      <EuiSpacer size="l" />
      <EuiFormRow
        label={flyoutLabels.accessControlScopeLabel}
        helpText={
          !canChangeAccessControlScope ? flyoutLabels.accessControlScopeDisabledReason : undefined
        }
        isInvalid={!!formState.errors.accessControl?.scope}
        error={formState.errors.accessControl?.scope?.message}
        fullWidth
      >
        <Controller
          name="accessControl.scope"
          control={control}
          render={({ field: { onChange, value } }) => (
            <EuiSuperSelect
              fullWidth
              options={accessControlScopeOptions}
              valueOfSelected={value}
              onChange={onChange}
              disabled={!canChangeAccessControlScope}
              aria-label={flyoutLabels.accessControlScopeAriaLabel}
              data-test-subj="editDetailsAccessControlScopeSelect"
            />
          )}
        />
      </EuiFormRow>
    </>
  );
};
