/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const SELECTOR_LIST_HEADER_HEIGHT = 57;
const SELECTOR_POPOVER_MAX_HEIGHT = 300;
export const SELECTOR_LIST_HEIGHT = SELECTOR_POPOVER_MAX_HEIGHT - SELECTOR_LIST_HEADER_HEIGHT;

export const useSelectorListStyles = ({ listId }: { listId: string }) => {
  const { euiTheme } = useEuiTheme();
  const listHeightStyles = css`
    &#${listId} .euiSelectableList__list {
      max-block-size: ${SELECTOR_LIST_HEIGHT}px;
    }
  `;
  const listItemStyles = css`
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
  `;
  const selectedItemStyles = css`
    &#${listId} .euiSelectableListItem-isFocused {
      :not(:hover) {
        background-color: unset;
      }
    }
  `;
  return [listHeightStyles, listItemStyles, selectedItemStyles];
};
