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

export const useSelectorListStyles = ({
  listId,
  withHeader,
}: {
  listId: string;
  withHeader: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  let listHeight = SELECTOR_POPOVER_MAX_HEIGHT;
  if (withHeader) {
    listHeight -= SELECTOR_LIST_HEADER_HEIGHT;
  }
  const listHeightStyles = css`
    &#${listId} .euiSelectableList__list {
      max-block-size: ${listHeight}px;
    }
  `;
  const listItemStyles = css`
    &#${listId} .euiSelectableListItem {
      border-style: none;
      color: unset;
      :hover {
        background-color: ${euiTheme.colors.backgroundBaseInteractiveSelect};
      }
      & .euiSelectableListItem__content {
        block-size: 100%;
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
