/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { type EuiThemeComputed } from '@elastic/eui';

export const resultField = (euiTheme: EuiThemeComputed<{}>) =>
  css({
    padding: 0,
    borderBottom: `1px solid ${euiTheme.colors.lightShade}`,
    position: 'relative',

    '&:last-child': {
      borderBottom: 'none',
    },

    '> .euiTableRow:hover': {
      backgroundColor: euiTheme.colors.emptyShade,
    },

    '> .euiTableRowCell': {
      borderTop: 'none',
      borderBottom: 'none',

      '> .euiTableCellContent': {
        padding: euiTheme.size.s,
        fontFamily: euiTheme.font.familyCode,
        color: euiTheme.colors.mediumShade,
      },
    },

    '.denseVectorFieldValue': {
      position: 'absolute',
      right: 0,
      top: euiTheme.size.s, // replaced $euiSizeS
      backgroundColor: euiTheme.colors.emptyShade, // replaced $euiColorEmptyShade
      padding: `0 ${euiTheme.size.s}`,
    },
  });

export const ResultHeader = styled.div<{ euiTheme: EuiThemeComputed<{}> }>`
  padding: ${({ euiTheme }) => `0 ${euiTheme.size.s} ${euiTheme.size.xs} 0`};
`;

export const definitionStyle = css({
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  maxWidth: '16rem',
});
