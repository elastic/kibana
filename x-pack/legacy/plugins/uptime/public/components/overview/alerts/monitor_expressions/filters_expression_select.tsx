/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { EuiExpression, EuiSpacer } from '@elastic/eui';
import { useGetUrlParams } from '../../../../hooks';
import { FilterPopover } from '../../filter_group/filter_popover';
import { overviewFiltersSelector } from '../../../../state/selectors';
import { filterLabels } from '../../filter_group/translations';

interface Props {
  setAlertParams: (key: string, value: any) => void;
}

export const FiltersExpressionsSelect: React.FC<Props> = ({ setAlertParams }) => {
  const { filters } = useGetUrlParams();

  const { tags, ports, schemes } = useSelector(overviewFiltersSelector);

  const filterKueries = new Map<string, string[]>(
    JSON.parse(filters === '' ? '[]' : filters ?? '[]')
  );

  const selectedTags = filterKueries.get('tags');
  const selectedPorts = filterKueries.get('url.port');
  const selectedScheme = filterKueries.get('monitor.type');

  const getSelectedItems = (fieldName: string) => filterKueries.get(fieldName) || [];

  const monitorFilters = [
    {
      loading: false,
      onFilterFieldChange: () => {},
      fieldName: 'url.port',
      id: 'filter_port',
      disabled: ports?.length === 0,
      items: ports?.map((p: number) => p.toString()) ?? [],
      selectedItems: getSelectedItems('url.port'),
      title: filterLabels.PORT,
      description: selectedPorts ? 'Using port' : 'Using',
      value: selectedPorts?.join(',') ?? 'any port',
    },
    {
      loading: false,
      onFilterFieldChange: () => {},
      fieldName: 'tags',
      id: 'filter_tags',
      disabled: tags?.length === 0,
      items: tags?.map((p: number) => p.toString()) ?? [],
      selectedItems: getSelectedItems('tags'),
      title: filterLabels.TAGS,
      description: selectedTags ? 'With tag' : 'With',
      value: selectedTags?.join(',') ?? 'any tag',
    },
    {
      loading: false,
      onFilterFieldChange: () => {},
      fieldName: 'monitor.type',
      id: 'filter_scheme',
      disabled: schemes?.length === 0,
      items: schemes?.map((p: number) => p.toString()) ?? [],
      selectedItems: getSelectedItems('monitor.type'),
      title: filterLabels.SCHEME,
      description: selectedScheme ? 'Of type' : 'Of',
      value: selectedScheme?.join(',') ?? 'any type',
    },
  ];

  const [isOpen, setIsOpen] = useState<boolean>({
    filter_port: false,
    filter_tags: false,
    filter_scheme: false,
  });

  return (
    <>
      {monitorFilters.map(({ description, value, ...item }) => (
        <span key={item.id}>
          <FilterPopover
            {...item}
            btnContent={
              <EuiExpression
                aria-label={'ariaLabel'}
                color={'secondary'}
                data-test-subj={''}
                description={description}
                value={value}
                onClick={() => setIsOpen({ ...isOpen, [item.id]: !isOpen[item.id] })}
              />
            }
            forceOpen={isOpen[item.id]}
            setForceOpen={() => {
              setIsOpen({ ...isOpen, [item.id]: !isOpen[item.id] });
            }}
          />
          <EuiSpacer size="xs" />
        </span>
      ))}

      <EuiSpacer size="xs" />
    </>
  );
};
