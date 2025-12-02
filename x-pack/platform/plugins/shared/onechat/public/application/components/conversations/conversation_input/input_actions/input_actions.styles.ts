/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { euiButtonEmptyColor, useEuiTheme } from '@elastic/eui';
import { roundedBorderRadiusStyles } from '../../conversation.styles';

export const usePopoverButtonStyles = ({ open }: { open: boolean }) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const popoverButtonStyles = css`
    transition-property: none;
    border: ${euiTheme.border.width.thick} solid transparent;

    ${roundedBorderRadiusStyles}
  `;
  const openPopoverStyles = css`
    border-color: ${euiTheme.colors.borderStrongText};
  `;
  const closedPopoverStyles = css`
    &:hover {
      /* Use the same border color as the on hover background color */
      border-color: ${euiButtonEmptyColor(euiThemeContext, 'text').backgroundColor};
    }
  `;
  return [popoverButtonStyles, open ? openPopoverStyles : closedPopoverStyles];
};

export const selectorListStyles = ({ listId }: { listId: string }) => css`
  /* Override list item styles */
  &#${listId} .euiSelectableListItem {
    border-style: none;
    background-color: transparent;
  }
`;
