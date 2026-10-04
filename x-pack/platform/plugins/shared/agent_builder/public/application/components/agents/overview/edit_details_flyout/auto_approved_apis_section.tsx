/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHorizontalRule, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import { labels } from '../../../../utils/i18n';
import { AutoApprovedApisField } from '../../common/auto_approved_apis_field';
import type { EditDetailsFormData } from './types';

export interface AutoApprovedApisSectionProps {
  /** Whether the current user can change the agent's access control, which this field shares. */
  canEdit: boolean;
}

export const AutoApprovedApisSection = ({ canEdit }: AutoApprovedApisSectionProps) => {
  const { control } = useFormContext<EditDetailsFormData>();

  return (
    <>
      <EuiHorizontalRule margin="xl" />
      <EuiPanel hasBorder paddingSize="l" data-test-subj="editDetailsAutoApprovedApisSection">
        <EuiTitle size="xxs">
          <h4>{labels.autoApprovedApis.sectionTitle}</h4>
        </EuiTitle>
        <EuiText size="xs" color="subdued">
          {labels.autoApprovedApis.sectionDescription}
        </EuiText>
        <EuiSpacer size="s" />
        <Controller
          name="configuration.auto_approved_apis"
          control={control}
          render={({ field }) => (
            <AutoApprovedApisField
              value={field.value}
              onChange={field.onChange}
              isDisabled={!canEdit}
              disabledReason={labels.autoApprovedApis.restrictedHelpText}
            />
          )}
        />
      </EuiPanel>
    </>
  );
};
