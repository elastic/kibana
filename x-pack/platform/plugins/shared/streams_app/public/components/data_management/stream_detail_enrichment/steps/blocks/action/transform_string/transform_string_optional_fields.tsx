/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useFormContext } from 'react-hook-form';

interface TransformStringTargetFieldProps {
  targetFieldHelpText: string;
}

export const TransformStringTargetField = ({
  targetFieldHelpText,
}: TransformStringTargetFieldProps) => {
  const { register } = useFormContext();
  const { ref, ...inputProps } = register('to');

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.transformStringTargetLabel',
        { defaultMessage: 'Target field' }
      )}
      helpText={targetFieldHelpText}
      fullWidth
    >
      <EuiFieldText {...inputProps} inputRef={ref} />
    </EuiFormRow>
  );
};
