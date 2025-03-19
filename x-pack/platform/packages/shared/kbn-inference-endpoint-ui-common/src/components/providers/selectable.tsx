/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelectable,
  EuiSelectableOption,
  EuiSelectableProps,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import {
  ProviderSolution,
  SERVICE_PROVIDERS,
  ServiceProviderIcon,
  ServiceProviderName,
} from './render_service_provider/service_provider';
import { ServiceProviderKeys } from '../../constants';
import { InferenceProvider } from '../../types/types';
import * as i18n from '../../translations';

interface SelectableProviderProps {
  providers: InferenceProvider[];
  onClosePopover: () => void;
  onProviderChange: (provider?: string) => void;
}

export const SelectableProvider: React.FC<SelectableProviderProps> = ({
  providers,
  onClosePopover,
  onProviderChange,
}) => {
  const renderProviderOption = useCallback<NonNullable<EuiSelectableProps['renderOption']>>(
    (option, searchValue) => {
      const provider = Object.keys(SERVICE_PROVIDERS).includes(option.label)
        ? SERVICE_PROVIDERS[option.label as ServiceProviderKeys]
        : undefined;

      const supportedBySolutions = (provider &&
        provider.solutions.map((solution) => (
          <EuiFlexItem>
            <EuiBadge color="hollow">{solution}</EuiBadge>
          </EuiFlexItem>
        ))) ?? (
        <EuiFlexItem>
          <EuiBadge color="hollow">{'Search' as ProviderSolution}</EuiBadge>
        </EuiFlexItem>
      );
      return (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <ServiceProviderIcon providerKey={option.label as ServiceProviderKeys} />
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <EuiFlexGroup gutterSize="none" direction="column" responsive={false}>
              <EuiFlexItem data-test-subj="provider">
                <ServiceProviderName
                  providerKey={option.label as ServiceProviderKeys}
                  searchValue={searchValue}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" responsive={false}>
              {supportedBySolutions}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    },
    []
  );

  const EuiSelectableContent = useCallback<NonNullable<EuiSelectableProps['children']>>(
    (list, search) => (
      <>
        {search}
        {list}
      </>
    ),
    []
  );

  const searchProps: EuiSelectableProps['searchProps'] = useMemo(
    () => ({
      'data-test-subj': 'provider-super-select-search-box',
      placeholder: i18n.SEARCHLABEL,
      incremental: false,
      compressed: true,
      fullWidth: true,
    }),
    []
  );

  const handleProviderChange = useCallback<NonNullable<EuiSelectableProps['onChange']>>(
    (options) => {
      const selectedProvider = options.filter((option) => option.checked === 'on');
      if (selectedProvider != null && selectedProvider.length > 0) {
        onProviderChange(selectedProvider[0].label);
      }
      onClosePopover();
    },
    [onClosePopover, onProviderChange]
  );

  const getSelectableOptions = useCallback(() => {
    return providers?.map((p) => ({
      label: p.service,
      key: p.service,
    })) as EuiSelectableOption[];
  }, [providers]);

  return (
    <EuiSelectable
      data-test-subj="add-inference-selectable-service"
      renderOption={renderProviderOption}
      onChange={handleProviderChange}
      searchable
      searchProps={searchProps}
      singleSelection={true}
      options={getSelectableOptions()}
    >
      {EuiSelectableContent}
    </EuiSelectable>
  );
};
