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
import { VISIBILITY_LABELS, VISIBILITY_TOOLTIPS } from '../../../../utils/visibility_i18n';
import type { EditDetailsFormData } from './types';

const { editDetails: flyoutLabels } = labels.agentOverview;

interface AccessSectionProps {
  canChangeVisibility: boolean;
}

const renderVisibilityOption = ({ icon, label }: { icon: IconType; label: string }) => (
  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiIcon type={icon} aria-hidden={true} />
    </EuiFlexItem>
    <EuiFlexItem>{label}</EuiFlexItem>
  </EuiFlexGroup>
);

const visibilityOptions = [
  {
    value: AgentAccessControlScope.Private,
    inputDisplay: renderVisibilityOption({
      icon: ACCESS_CONTROL_SCOPE_ICON[AgentAccessControlScope.Private],
      label: VISIBILITY_LABELS[AgentAccessControlScope.Private],
    }),
    dropdownDisplay: (
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
        <EuiFlexItem>
          {renderVisibilityOption({
            icon: ACCESS_CONTROL_SCOPE_ICON[AgentAccessControlScope.Private],
            label: VISIBILITY_LABELS[AgentAccessControlScope.Private],
          })}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {VISIBILITY_TOOLTIPS[AgentAccessControlScope.Private]}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
  {
    value: AgentAccessControlScope.Shared,
    inputDisplay: renderVisibilityOption({
      icon: ACCESS_CONTROL_SCOPE_ICON[AgentAccessControlScope.Shared],
      label: VISIBILITY_LABELS[AgentAccessControlScope.Shared],
    }),
    dropdownDisplay: (
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
        <EuiFlexItem>
          {renderVisibilityOption({
            icon: ACCESS_CONTROL_SCOPE_ICON[AgentAccessControlScope.Shared],
            label: VISIBILITY_LABELS[AgentAccessControlScope.Shared],
          })}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {VISIBILITY_TOOLTIPS[AgentAccessControlScope.Shared]}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
  {
    value: AgentAccessControlScope.Public,
    inputDisplay: renderVisibilityOption({
      icon: ACCESS_CONTROL_SCOPE_ICON[AgentAccessControlScope.Public],
      label: VISIBILITY_LABELS[AgentAccessControlScope.Public],
    }),
    dropdownDisplay: (
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
        <EuiFlexItem>
          {renderVisibilityOption({
            icon: ACCESS_CONTROL_SCOPE_ICON[AgentAccessControlScope.Public],
            label: VISIBILITY_LABELS[AgentAccessControlScope.Public],
          })}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {VISIBILITY_TOOLTIPS[AgentAccessControlScope.Public]}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
];

export const AccessSection: React.FC<AccessSectionProps> = ({ canChangeVisibility }) => {
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
        label={flyoutLabels.visibilityLabel}
        helpText={!canChangeVisibility ? flyoutLabels.visibilityDisabledReason : undefined}
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
              options={visibilityOptions}
              valueOfSelected={value}
              onChange={onChange}
              disabled={!canChangeVisibility}
              aria-label={flyoutLabels.visibilityAriaLabel}
              data-test-subj="editDetailsVisibilitySelect"
            />
          )}
        />
      </EuiFormRow>
    </>
  );
};
