/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Cloud provider filter — a dropdown to narrow Cloud entities to a
 * single provider (AWS / GCP / Azure). Modeled after the Kubernetes
 * cluster filter so the two controls look identical in the toolbar.
 */

import React, { useMemo } from 'react';
import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Entity } from './fake_entities';
import { CLOUD_PROVIDERS, type CloudProviderId } from './cloud_providers';
import { labThings, useIsElasticOn } from '../lab_terminology';

export const CLOUD_PROVIDER_FILTER_ALL = '__all__';

/**
 * Filter a list of Cloud entities by the currently-selected provider.
 * Pass-through when the filter is `__all__`.
 */
export const filterEntitiesByProvider = (
  entities: readonly Entity[],
  providerFilter: string
): readonly Entity[] => {
  if (providerFilter === CLOUD_PROVIDER_FILTER_ALL) return entities;
  return entities.filter((entity) => entity.provider === providerFilter);
};

interface CloudProviderFilterProps {
  readonly value: string;
  readonly onChange: (next: string) => void;
}

/**
 * Compact dropdown with an inline "Provider" label. Defaults to "All
 * providers" which is a pass-through. Placed next to the Kubernetes
 * cluster filter in the toolbar when the Cloud category is visible.
 */
export const CloudProviderFilter = ({ value, onChange }: CloudProviderFilterProps) => {
  const isElasticOn = useIsElasticOn();
  const allProvidersLabel = i18n.translate(
    'xpack.streams.entityCentricLab.entities.cloudProviderFilter.allOption',
    { defaultMessage: 'All providers' }
  );
  const options = useMemo(
    () => [
      {
        value: CLOUD_PROVIDER_FILTER_ALL,
        text: allProvidersLabel,
      },
      ...CLOUD_PROVIDERS.map((provider) => ({
        value: provider.id,
        text: i18n.translate(
          'xpack.streams.entityCentricLab.entities.cloudProviderFilter.providerOption',
          { defaultMessage: 'Provider: {name}', values: { name: provider.label } }
        ),
      })),
    ],
    [allProvidersLabel]
  );
  return (
    <EuiSelect
      compressed
      options={options}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={i18n.translate(
        'xpack.streams.entityCentricLab.entities.cloudProviderFilter.ariaLabel',
        {
          defaultMessage: 'Filter Cloud {things} by provider',
          values: { things: labThings(isElasticOn) },
        }
      )}
      data-test-subj="entityCentricLabCloudProviderFilter"
    />
  );
};
