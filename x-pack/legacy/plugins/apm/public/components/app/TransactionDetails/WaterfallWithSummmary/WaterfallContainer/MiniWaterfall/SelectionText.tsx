/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiText, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { CSSProperties } from 'react';
import { Selection } from './';

interface SelectionTextProps {
  selection: Selection;
  resetSelection: () => void;
}

export function SelectionText({
  selection,
  resetSelection
}: SelectionTextProps) {
  const start = selection[0] && (selection[0] / 100).toFixed(0);
  const end = selection[1] && (selection[1] / 100).toFixed(0);
  const style: CSSProperties = {
    visibility: selection[0] ? 'visible' : 'hidden'
  };

  return (
    <span style={style}>
      <EuiText color="subdued" size="xs" textAlign="right">
        {i18n.translate(
          'xpack.apm.transactionDetails.miniWaterfall.selectionText',
          {
            defaultMessage: 'Selected {start} – {end} ms',
            values: { start, end }
          }
        )}
        |{' '}
        <EuiLink onClick={resetSelection}>
          {i18n.translate(
            'xpack.apm.transactionDetails.miniWaterfall.resetButtonText',
            {
              defaultMessage: 'Reset'
            }
          )}
        </EuiLink>
      </EuiText>
      <EuiSpacer size="s" />
    </span>
  );
}
