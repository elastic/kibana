/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent, Ref } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import type { EuiSuperSelectOption, EuiSelectableOption } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInputPopover,
  EuiLink,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSuperSelectControl,
} from '@elastic/eui';

import { DATA_SOURCE_TYPES_TO_ICONS, type DataSource } from '../../common';
import { DataSourceConnectionStatusHealth } from '../data_source_connection_status_badge';

const selectableListProps = {
  onFocusBadge: false,
  paddingSize: 's' as const,
  css: css`
    max-block-size: 300px;
    overflow-y: auto;
  `,
  bordered: false,
};

const DataSourceOptionDisplay: FunctionComponent<{ dataSource: DataSource }> = ({ dataSource }) => {
  const iconType = DATA_SOURCE_TYPES_TO_ICONS[dataSource.type];

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      responsive={false}
      justifyContent="spaceBetween"
      css={{ inlineSize: '100%' }}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={iconType} size="m" aria-hidden />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{dataSource.name}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <DataSourceConnectionStatusHealth dataSourceName={dataSource.name} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export interface DataSourceSuperSelectProps {
  dataSources: DataSource[];
  value?: string;
  onChange: (value: string) => void;
  onConnectNewDataSource: () => void;
  placeholder: string;
  searchPlaceholder: string;
  connectNewDataSourceLabel: string;
  'aria-label': string;
  'data-test-subj'?: string;
  name?: string;
  buttonRef?: Ref<HTMLButtonElement>;
  isInvalid?: boolean;
  fullWidth?: boolean;
}

export const DataSourceSuperSelect: FunctionComponent<DataSourceSuperSelectProps> = ({
  dataSources,
  value,
  onChange,
  onConnectNewDataSource,
  placeholder,
  searchPlaceholder,
  connectNewDataSourceLabel,
  'aria-label': ariaLabel,
  'data-test-subj': dataTestSubj,
  name,
  buttonRef,
  isInvalid = false,
  fullWidth = false,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const controlOptions = useMemo(
    (): Array<EuiSuperSelectOption<string>> =>
      dataSources.map((ds) => ({
        value: ds.name,
        inputDisplay: <DataSourceOptionDisplay dataSource={ds} />,
      })),
    [dataSources]
  );

  const selectableOptions = useMemo(
    (): EuiSelectableOption[] =>
      dataSources.map((ds) => ({
        key: ds.name,
        label: ds.name,
        searchableLabel: ds.name,
        checked: value === ds.name ? 'on' : undefined,
        prepend: <EuiIcon type={DATA_SOURCE_TYPES_TO_ICONS[ds.type]} size="m" aria-hidden />,
        append: <DataSourceConnectionStatusHealth dataSourceName={ds.name} />,
      })),
    [dataSources, value]
  );

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const togglePopover = useCallback(() => {
    setIsPopoverOpen((open) => !open);
  }, []);

  const handleSelect = useCallback(
    (dataSourceName: string) => {
      onChange(dataSourceName);
      closePopover();
    },
    [closePopover, onChange]
  );

  const handleConnectNew = useCallback(() => {
    closePopover();
    onConnectNewDataSource();
  }, [closePopover, onConnectNewDataSource]);

  const control = (
    <EuiSuperSelectControl
      options={controlOptions}
      value={value}
      placeholder={placeholder}
      onClick={togglePopover}
      className="euiSuperSelectControl"
      fullWidth={fullWidth}
      isInvalid={isInvalid}
      isDropdownOpen={isPopoverOpen}
      name={name}
      buttonRef={buttonRef}
      aria-label={ariaLabel}
      data-test-subj={dataTestSubj}
    />
  );

  return (
    <EuiInputPopover
      className="euiSuperSelect"
      input={control}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      fullWidth={fullWidth}
      disableFocusTrap
    >
      <EuiSelectable
        searchable
        searchProps={{
          placeholder: searchPlaceholder,
          'data-test-subj': `${dataTestSubj ?? 'dataSourceSuperSelect'}Search`,
        }}
        singleSelection="always"
        options={selectableOptions}
        listProps={selectableListProps}
        onChange={(_newOptions, _event, changedOption) => {
          if (changedOption?.key) {
            handleSelect(String(changedOption.key));
          }
        }}
      >
        {(list, search) => (
          <>
            <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
            {list}
          </>
        )}
      </EuiSelectable>
      <EuiPopoverFooter paddingSize="s">
        <EuiFlexGroup justifyContent="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiLink data-test-subj="datasetWizardConnectNewDataSource" onClick={handleConnectNew}>
              {connectNewDataSourceLabel}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverFooter>
    </EuiInputPopover>
  );
};
