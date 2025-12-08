/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const useSelectorListStyles = ({ listId }: { listId: string }) => {
  const { euiTheme } = useEuiTheme();
  return css`
    /* Override list item styles */
    /* Styles for all items */
    &#${listId} .euiSelectableListItem {
      border-style: none;
      color: unset;
      :hover {
        background-color: ${euiTheme.colors.backgroundBaseInteractiveSelect};
      }
      & .euiSelectableListItem__text {
        text-decoration: none;
      }
    }

    /* Styles for selected item */
    &#${listId} .euiSelectableListItem-isFocused {
      :not(:hover) {
        background-color: unset;
      }
    }
  `;
};
