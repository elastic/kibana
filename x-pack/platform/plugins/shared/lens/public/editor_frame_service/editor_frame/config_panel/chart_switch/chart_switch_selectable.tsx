/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiSelectable,
  EuiPopoverTitle,
  EuiSelectableProps,
  EuiSelectableOption,
  IconType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css, cx } from '@emotion/css';
import { ChartOption } from './chart_option';

export type SelectableEntry = EuiSelectableOption<{
  value: string;
  description?: string;
  icon?: IconType;
}>;

const ITEM_HEIGHT = 52;
const MAX_ITEMS_COUNT = 6;
const MAX_LIST_HEIGHT = ITEM_HEIGHT * MAX_ITEMS_COUNT;

function computeListHeight(list: SelectableEntry[]) {
  if (list.length > MAX_ITEMS_COUNT) {
    return MAX_LIST_HEIGHT;
  }
}

const styles = {
  selectable: css`
    width: 384px;
  `,
  searchInput: css`
    width: 400px;
  `,
  noMatches: css`
    display: inline;
  `,
};

export const ChartSwitchSelectable = ({
  setSearchTerm,
  searchTerm,
  ...props
}: { setSearchTerm: (val: string) => void; searchTerm: string } & EuiSelectableProps) => {
  return (
    <EuiSelectable
      singleSelection
      isPreFiltered
      data-test-subj="lnsChartSwitchList"
      className={cx('lnsChartSwitch__options', styles.selectable)}
      height={computeListHeight(props.options as SelectableEntry[])}
      searchProps={{
        compressed: true,
        autoFocus: false,
        inputRef: (ref) => {
          ref?.focus({ preventScroll: true });
        },
        className: styles.searchInput,
        'data-test-subj': 'lnsChartSwitchSearch',
        onChange: setSearchTerm,
        placeholder: i18n.translate('xpack.lens.chartSwitch.search', {
          defaultMessage: 'Search visualizations',
        }),
      }}
      listProps={{
        showIcons: false,
        onFocusBadge: false,
        isVirtualized: false,
      }}
      renderOption={(option, searchValue) => (
        <ChartOption option={option} searchValue={searchValue} />
      )}
      noMatchesMessage={
        <div className={styles.noMatches}>
          <FormattedMessage
            id="xpack.lens.chartSwitch.noResults"
            defaultMessage="No results found for {term}."
            values={{
              term: <strong>{searchTerm}</strong>,
            }}
          />
        </div>
      }
      {...props}
      searchable
    >
      {(list, search) => (
        <>
          <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
          {list}
        </>
      )}
    </EuiSelectable>
  );
};
