/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiText, EuiTextArea, EuiTitle } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import { labels } from '../../../../utils/i18n';
import type { EditDetailsFormData } from './types';

const { editDetails: flyoutLabels } = labels.agentOverview;

export const CustomInstructionsSection: React.FC = () => {
  const { control } = useFormContext<EditDetailsFormData>();

  return (
    <>
      <EuiTitle size="xs">
        <h3>{flyoutLabels.instructionsTitle}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued" component="p">
        {flyoutLabels.instructionsDescription}
      </EuiText>
      <EuiSpacer size="l" />

      <Controller
        name="configuration.instructions"
        control={control}
        render={({ field: { ref, ...rest } }) => (
          <EuiTextArea
            {...rest}
            inputRef={ref}
            fullWidth
            rows={6}
            placeholder={flyoutLabels.instructionsPlaceholder}
            data-test-subj="editDetailsInstructionsInput"
          />
        )}
      />
    </>
  );
};
