/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiComboBox, EuiFormRow, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import { useAgentLabels } from '../../../../hooks/agents/use_agent_labels';
import { labels } from '../../../../utils/i18n';
import type { EditDetailsFormData } from './types';

const { editDetails: flyoutLabels } = labels.agentOverview;

export const TagsSection: React.FC = () => {
  const { control } = useFormContext<EditDetailsFormData>();
  const { labels: existingLabels, isLoading: labelsLoading } = useAgentLabels();

  return (
    <>
      <EuiTitle size="xs">
        <h3>{flyoutLabels.tagsTitle}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued" component="p">
        {flyoutLabels.tagsDescription}
      </EuiText>
      <EuiSpacer size="l" />

      <EuiFormRow aria-label={flyoutLabels.tagsLabel} fullWidth>
        <Controller
          name="labels"
          control={control}
          render={({ field }) => (
            <EuiComboBox
              fullWidth
              selectedOptions={(field.value || []).map((l: string) => ({ label: l }))}
              options={existingLabels.map((label) => ({ label }))}
              onCreateOption={(searchValue: string) => {
                const newLabel = searchValue.trim();
                if (!newLabel) return;
                field.onChange(Array.from(new Set([...(field.value || []), newLabel])));
              }}
              onChange={(options) => field.onChange(options.map((o) => o.label))}
              isLoading={labelsLoading}
              isClearable
              data-test-subj="editDetailsTagsComboBox"
            />
          )}
        />
      </EuiFormRow>
    </>
  );
};
