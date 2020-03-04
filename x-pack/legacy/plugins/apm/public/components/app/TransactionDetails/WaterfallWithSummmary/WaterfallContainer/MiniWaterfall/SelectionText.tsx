/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiText, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { CSSProperties } from 'react';
import { WaterfallSelection } from '../';
import { asDuration } from '../../../../../../utils/formatters';

interface SelectionTextProps {
  selection: WaterfallSelection;
  resetSelection: () => void;
}

export function SelectionText({
  selection,
  resetSelection
}: SelectionTextProps) {
  const style: CSSProperties = {
    visibility: selection[0] ? 'visible' : 'hidden'
  };

  const start = asDuration(selection[0]);
  const end = asDuration(selection[1]);
  const range = `${start} – ${end}`;

  return (
    <span style={style}>
      <EuiText color="subdued" size="xs" textAlign="right">
        {i18n.translate(
          'xpack.apm.transactionDetails.miniWaterfall.selectionText',
          {
            defaultMessage: 'Selected {range}',
            values: { range }
          }
        )}{' '}
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
