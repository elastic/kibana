/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { roundedBorderRadiusStyles } from '../../conversation.styles';

export const usePopoverButtonStyles = ({
  open,
  disabled = false,
}: {
  open: boolean;
  disabled?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const popoverButtonStyles = css`
    transition-property: none;
    min-inline-size: 0;
    ${roundedBorderRadiusStyles}
  `;
  const closedPopoverStyles = css`
    &:not(:hover) {
      border-color: transparent;
    }
  `;
  const disabledStyles = css`
    cursor: default;
    background-color: transparent;
    color: ${euiTheme.colors.textParagraph};
  `;
  return [popoverButtonStyles, !open && closedPopoverStyles, disabled && disabledStyles];
};

export const selectorListStyles = ({ listId }: { listId: string }) => css`
  /* Override list item styles */
  &#${listId} .euiSelectableListItem {
    border-style: none;
    background-color: transparent;
  }
`;
