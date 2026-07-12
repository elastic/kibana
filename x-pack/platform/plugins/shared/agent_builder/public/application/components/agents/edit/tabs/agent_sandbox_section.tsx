/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { SerializedStyles } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiSuperSelect,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Control } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { useSandboxProfiles } from '../../../../hooks/sandboxes/use_sandbox_profiles';
import { appPaths } from '../../../../utils/app_paths';
import type { AgentFormData } from '../agent_form';

interface Props {
  control: Control<AgentFormData>;
  isFormDisabled: boolean;
  formFlexColumnStyles: SerializedStyles;
}

const NONE_VALUE = '__none__';

/**
 * Experimental: attach a Sandbox Profile to give the agent a coding sub-agent.
 * When no profile is selected, the agent behaves as a normal Agent Builder agent.
 */
export const AgentSandboxSection: React.FC<Props> = ({
  control,
  isFormDisabled,
  formFlexColumnStyles,
}) => {
  const { profiles, isLoading } = useSandboxProfiles();

  const options = [
    {
      value: NONE_VALUE,
      inputDisplay: i18n.translate('xpack.agentBuilder.agents.form.sandbox.none', {
        defaultMessage: 'None (no coding sub-agent)',
      }),
    },
    ...profiles.map((p) => ({
      value: p.id,
      inputDisplay: `${p.name} (${p.provider} / ${p.runtime})`,
    })),
  ];

  return (
    <EuiFlexGroup
      direction="row"
      gutterSize="xl"
      alignItems="flexStart"
      aria-labelledby="sandbox-section-title"
    >
      <EuiFlexItem grow={1}>
        <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
          <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
            <EuiIcon type="node" aria-hidden={true} />
            <EuiTitle size="xs">
              <h2 id="sandbox-section-title">
                {i18n.translate('xpack.agentBuilder.agents.form.sandbox.title', {
                  defaultMessage: 'Coding sandbox (experimental)',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexGroup>
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.agentBuilder.agents.form.sandbox.description', {
              defaultMessage:
                'Attach a sandbox to give this agent a coding sub-agent that writes and runs code in isolation. Leave as None to keep normal Agent Builder behavior.',
            })}
          </EuiText>
          <EuiLink href={`#${appPaths.manage.sandboxes}`} target="_blank">
            {i18n.translate('xpack.agentBuilder.agents.form.sandbox.manageLink', {
              defaultMessage: 'Manage sandboxes',
            })}
          </EuiLink>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={2} css={formFlexColumnStyles}>
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.agentBuilder.agents.form.sandbox.label', {
            defaultMessage: 'Sandbox',
          })}
        >
          <Controller
            name="configuration.sandbox_profile_id"
            control={control}
            render={({ field: { onChange, value } }) => (
              <EuiSuperSelect
                fullWidth
                isLoading={isLoading}
                disabled={isFormDisabled}
                options={options}
                valueOfSelected={value || NONE_VALUE}
                onChange={(v) => onChange(v === NONE_VALUE ? null : v)}
                data-test-subj="agentBuilderAgentSandboxSelect"
              />
            )}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
