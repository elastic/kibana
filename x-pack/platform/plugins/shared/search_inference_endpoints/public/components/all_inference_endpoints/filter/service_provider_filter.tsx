/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFilterGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';
import { SERVICE_PROVIDERS } from '@kbn/inference-endpoint-ui-common';
import type { FilterOptions } from '../../../types';
import type { MultiSelectFilterOption } from '../../filter/multi_select_filter';
import { MultiSelectFilter } from '../../filter/multi_select_filter';

interface Props {
  optionKeys: ServiceProviderKeys[];
  onChange: (newFilterOptions: Partial<FilterOptions>) => void;
  uniqueProviders: Set<ServiceProviderKeys>;
}

export const ServiceProviderFilter: React.FC<Props> = ({
  optionKeys,
  onChange,
  uniqueProviders,
}) => {
  const filterId: string = 'provider';
  const onSystemFilterChange = (newOptions: MultiSelectFilterOption[]) => {
    onChange({
      [filterId]: newOptions
        .filter((option) => option.checked === 'on')
        .map((option) => option.key),
    });
  };

  const filteredOptions = useMemo<MultiSelectFilterOption[]>(() => {
    return Array.from(uniqueProviders).map((provider) => ({
      key: provider,
      label: SERVICE_PROVIDERS[provider]?.name ?? provider,
    }));
  }, [uniqueProviders]);

  return (
    <EuiFilterGroup>
      <MultiSelectFilter
        buttonLabel={i18n.translate('xpack.searchInferenceEndpoints.serviceProvider', {
          defaultMessage: 'Service',
        })}
        ariaLabel={i18n.translate('xpack.searchInferenceEndpoints.serviceProvider.ariaLabel', {
          defaultMessage: 'Service Provider Options',
        })}
        onChange={onSystemFilterChange}
        options={filteredOptions}
        renderOption={(option) => option.label}
        selectedOptionKeys={optionKeys}
        dataTestSubj="service-field-endpoints"
      />
    </EuiFilterGroup>
  );
};
