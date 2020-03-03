/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiText } from '@elastic/eui';
import lightTheme from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import React, { CSSProperties } from 'react';
import styled from 'styled-components';
import { Selection } from './';

const Text = styled(EuiText)`
  font-size: ${lightTheme.euiFontSizeXS};
  margin-bottom: ${lightTheme.spacerSizes.s};
  text-align: right;
`;

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
      <Text color="subdued">
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
      </Text>
    </span>
  );
}
