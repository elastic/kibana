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
  EuiHorizontalRule,
  EuiIcon,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import { labels } from '../../../../utils/i18n';
import { AutoApprovedApisField } from '../../common/auto_approved_apis_field';
import type { AgentFormData } from '../agent_form';

export interface AutoApprovedApisSectionProps {
  isFormDisabled: boolean;
  /** Whether the current user can change the agent's access control, which this field shares. */
  canEdit: boolean;
}

export const AutoApprovedApisSection = ({
  isFormDisabled,
  canEdit,
}: AutoApprovedApisSectionProps) => {
  const { control } = useFormContext<AgentFormData>();

  return (
    <>
      <EuiHorizontalRule />
      <EuiFlexGroup
        direction="row"
        gutterSize="xl"
        alignItems="flexStart"
        aria-labelledby="auto-approved-apis-section-title"
        data-test-subj="agentSettingsAutoApprovedApisSection"
      >
        <EuiFlexItem grow={1}>
          <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
            <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
              <EuiIcon type="lockOpen" aria-hidden={true} />
              <EuiTitle size="xs">
                <h2 id="auto-approved-apis-section-title">
                  {labels.autoApprovedApis.sectionTitle}
                </h2>
              </EuiTitle>
            </EuiFlexGroup>
            <EuiText size="s" color="subdued">
              <p>{labels.autoApprovedApis.sectionDescription}</p>
            </EuiText>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={2} css={{ minWidth: 0 }}>
          <Controller
            name="configuration.approvals"
            control={control}
            render={({ field: { value, onChange } }) => (
              <AutoApprovedApisField
                value={value?.auto_approved_apis}
                onChange={(autoApprovedApis) => onChange({ auto_approved_apis: autoApprovedApis })}
                isDisabled={isFormDisabled || !canEdit}
                disabledReason={canEdit ? undefined : labels.autoApprovedApis.restrictedHelpText}
              />
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
