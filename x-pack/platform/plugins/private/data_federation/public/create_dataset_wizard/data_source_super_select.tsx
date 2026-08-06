/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent, Ref } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import type { EuiSuperSelectOption } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInputPopover,
  EuiLink,
  EuiPopoverFooter,
  EuiSuperSelectControl,
  useEuiTheme,
} from '@elastic/eui';

import { DATA_SOURCE_TYPES_TO_ICONS, type DataSource } from '../../common';
import { DataSourceConnectionStatusHealth } from '../data_source_connection_status_badge';

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
  connectNewDataSourceLabel,
  'aria-label': ariaLabel,
  'data-test-subj': dataTestSubj,
  name,
  buttonRef,
  isInvalid = false,
  fullWidth = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const controlOptions = useMemo(
    (): Array<EuiSuperSelectOption<string>> =>
      dataSources.map((ds) => ({
        value: ds.name,
        inputDisplay: <DataSourceOptionDisplay dataSource={ds} />,
      })),
    [dataSources]
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

  const listboxStyles = css`
    max-block-size: 300px;
    overflow-y: auto;
    overflow-x: hidden;
    padding: ${euiTheme.size.s};

    .euiSuperSelect__item:focus {
      outline: none;
    }
  `;

  const itemStyles = css`
    display: block;
    inline-size: 100%;
    padding: ${euiTheme.size.xs} ${euiTheme.size.s};
    text-align: start;
    color: ${euiTheme.colors.text};
    background: transparent;
    border: none;
    cursor: pointer;

    &:hover,
    &:focus {
      background: ${euiTheme.focus.backgroundColor};
    }
  `;

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
      <div
        className="euiSuperSelect__listbox eui-scrollBar"
        css={listboxStyles}
        role="listbox"
        aria-label={ariaLabel}
      >
        {dataSources.map((ds) => (
          <button
            key={ds.name}
            type="button"
            className="euiSuperSelect__item"
            css={itemStyles}
            role="option"
            id={ds.name}
            onClick={() => handleSelect(ds.name)}
            aria-selected={value === ds.name}
          >
            <DataSourceOptionDisplay dataSource={ds} />
          </button>
        ))}
      </div>
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
