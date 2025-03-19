/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { EuiCode, EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export const DissectAppendSeparator = () => {
  const { register } = useFormContext();
  const { ref, ...inputProps } = register(`append_separator`);

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.dissectPatternSeparatorLabel',
        { defaultMessage: 'Append separator' }
      )}
      helpText={
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.dissectPatternSeparatorHelpText"
          defaultMessage="If you specify a key modifier, this character separates the fields when appending results. Defaults to {value}."
          values={{ value: <EuiCode>&quot;&quot;</EuiCode> }}
        />
      }
      fullWidth
    >
      <EuiFieldText
        data-test-subj="streamsAppDissectAppendSeparatorFieldText"
        {...inputProps}
        inputRef={ref}
      />
    </EuiFormRow>
  );
};
