/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCopy, EuiFieldText, EuiFormRow } from '@elastic/eui';

interface CopyableFieldProps {
  label: string;
  value: string;
  helpText?: React.ReactNode;
  copyAriaLabel: string;
  'data-test-subj': string;
}

/** A read-only text field with a copy icon, same shape as the inbound webhook connector form. */
export const CopyableField = ({
  label,
  value,
  helpText,
  copyAriaLabel,
  'data-test-subj': dataTestSubj,
}: CopyableFieldProps) => (
  <EuiFormRow label={label} helpText={helpText} fullWidth>
    <EuiCopy
      textToCopy={value}
      beforeMessage={copyAriaLabel}
      tooltipProps={{ disableScreenReaderOutput: true, anchorClassName: 'eui-displayBlock' }}
    >
      {(copy) => (
        <EuiFieldText
          readOnly
          fullWidth
          value={value}
          data-test-subj={dataTestSubj}
          icon={{
            type: 'copy',
            side: 'right',
            onClick: copy,
            'aria-label': copyAriaLabel,
            'data-test-subj': `${dataTestSubj}-copy`,
          }}
        />
      )}
    </EuiCopy>
  </EuiFormRow>
);
