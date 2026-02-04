/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const SELECTOR_LIST_HEADER_HEIGHT = 57;
export const SELECTOR_LIST_FOOTER_HEIGHT = 57;
const SELECTOR_POPOVER_MAX_HEIGHT = 300;
export const getMaxListHeight = ({
  withHeader,
  withFooter,
}: {
  withHeader?: boolean;
  withFooter?: boolean;
}) => {
  let height = SELECTOR_POPOVER_MAX_HEIGHT;
  if (withHeader) {
    height -= SELECTOR_LIST_HEADER_HEIGHT;
  }
  if (withFooter) {
    height -= SELECTOR_LIST_FOOTER_HEIGHT;
  }
  return height;
};

const SELECTOR_POPOVER_WIDTH = 275;
export const selectorPopoverPanelStyles = css`
  inline-size: ${SELECTOR_POPOVER_WIDTH}px;
`;

export const useSelectorListStyles = ({ listId }: { listId: string }) => {
  const { euiTheme } = useEuiTheme();
  const listItemStyles = css`
    &#${listId} .euiSelectableListItem {
      border-style: none;
      color: unset;
      padding: calc(${euiTheme.size.m} * 0.5) ${euiTheme.size.m};
      :hover {
        background-color: ${euiTheme.colors.backgroundBaseInteractiveSelect};
      }
      & .euiSelectableListItem__content {
        block-size: 100%;
        gap: ${euiTheme.size.s};
        .euiSelectableListItem__icon,
        .euiSelectableListItem__prepend,
        .euiSelectableListItem__append {
          margin: 0;
        }
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
  return [listItemStyles, selectedItemStyles];
};
