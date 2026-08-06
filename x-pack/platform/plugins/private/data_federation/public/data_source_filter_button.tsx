/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useMemo, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiPanel,
  EuiPopover,
  EuiSelectable,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { mainTranslations } from './main_i18n';

const selectableListCss = css`
  width: 220px;
`;

export interface DataSourceFilterButtonProps {
  dataSourceNames: string[];
  selectedDataSourceNames: readonly string[];
  onChange: (selected: string[]) => void;
}

export const DataSourceFilterButton: FunctionComponent<DataSourceFilterButtonProps> = ({
  dataSourceNames,
  selectedDataSourceNames,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedSet = useMemo(() => new Set(selectedDataSourceNames), [selectedDataSourceNames]);

  const selectableOptions = useMemo(
    (): EuiSelectableOption[] =>
      dataSourceNames.map((name) => ({
        label: name,
        checked: selectedSet.has(name) ? 'on' : undefined,
      })),
    [dataSourceNames, selectedSet]
  );

  const numActiveFilters = selectedDataSourceNames.length;

  return (
    <EuiFilterGroup>
      <EuiPopover
        button={
          <EuiFilterButton
            data-test-subj="dataSetsSetsDataSourceFilter"
            iconType="arrowDown"
            onClick={() => setIsOpen((open) => !open)}
            isSelected={isOpen}
            numFilters={dataSourceNames.length}
            hasActiveFilters={numActiveFilters > 0}
            numActiveFilters={numActiveFilters}
          >
            {mainTranslations.filters.dataSource}
          </EuiFilterButton>
        }
        isOpen={isOpen}
        closePopover={() => setIsOpen(false)}
        panelPaddingSize="none"
      >
        <EuiSelectable
          options={selectableOptions}
          searchable
          searchProps={{
            placeholder: mainTranslations.filters.dataSourceSearchPlaceholder,
          }}
          onChange={(newOptions) => {
            onChange(
              newOptions
                .filter((option) => option.checked === 'on')
                .map((option) => String(option.label))
            );
          }}
        >
          {(list) => (
            <EuiPanel paddingSize="none" css={selectableListCss}>
              {list}
            </EuiPanel>
          )}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
