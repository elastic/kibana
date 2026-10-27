/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiComboBox } from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Entity } from './fake_entities';

export type AlertsFilterId = 'all' | 'active' | 'no_setup' | 'no_active';

export const ALERTS_FILTER_ALL: AlertsFilterId = 'all';

/** Shareable URL param for left-nav alert bell deep links. */
export const ALERTS_FILTER_QUERY_PARAM = 'alertsFilter';

const isAlertsFilterId = (value: string): value is AlertsFilterId =>
  value === 'all' ||
  value === 'active' ||
  value === 'no_setup' ||
  value === 'no_active';

export const parseAlertsFilterFromSearch = (search: string): AlertsFilterId | null => {
  const raw = new URLSearchParams(search).get(ALERTS_FILTER_QUERY_PARAM);
  if (!raw || !isAlertsFilterId(raw)) return null;
  return raw;
};

const ALERTS_FILTER_OPTIONS: readonly { readonly id: Exclude<AlertsFilterId, 'all'>; readonly label: string }[] =
  [
    {
      id: 'active',
      label: i18n.translate('xpack.streams.entityCentricLab.entities.alertsFilter.active', {
        defaultMessage: 'Active alerts',
      }),
    },
    {
      id: 'no_setup',
      label: i18n.translate('xpack.streams.entityCentricLab.entities.alertsFilter.noSetup', {
        defaultMessage: 'No alert set up',
      }),
    },
    {
      id: 'no_active',
      label: i18n.translate('xpack.streams.entityCentricLab.entities.alertsFilter.noActive', {
        defaultMessage: 'No active alerts',
      }),
    },
  ];

export const getEntityAlertsBucket = (entity: Entity): Exclude<AlertsFilterId, 'all'> => {
  if (!entity.alerts) return 'no_setup';
  if (entity.alerts.active > 0) return 'active';
  return 'no_active';
};

export const matchesAlertsFilter = (entity: Entity, filter: AlertsFilterId): boolean => {
  if (filter === ALERTS_FILTER_ALL) return true;
  return getEntityAlertsBucket(entity) === filter;
};

interface Props {
  readonly value: AlertsFilterId;
  readonly onChange: (next: AlertsFilterId) => void;
}

/**
 * Compact alerts dropdown matching the Category / Provider ComboBox style.
 */
export const EntityAlertsFilter = ({ value, onChange }: Props) => {
  const allLabel = i18n.translate('xpack.streams.entityCentricLab.entities.alertsFilter.all', {
    defaultMessage: 'All alerts',
  });

  const options = useMemo<EuiComboBoxOptionOption[]>(
    () =>
      ALERTS_FILTER_OPTIONS.map((option) => ({
        label: option.label,
        value: option.id,
      })),
    []
  );

  const selectedOptions = useMemo<EuiComboBoxOptionOption[]>(() => {
    if (value === ALERTS_FILTER_ALL) return [];
    const match = ALERTS_FILTER_OPTIONS.find((option) => option.id === value);
    return match ? [{ label: match.label, value: match.id }] : [];
  }, [value]);

  const handleChange = useCallback(
    (selected: EuiComboBoxOptionOption[]) => {
      onChange(
        selected.length > 0 ? (selected[0].value as AlertsFilterId) : ALERTS_FILTER_ALL
      );
    },
    [onChange]
  );

  return (
    <EuiComboBox
      compressed
      singleSelection={{ asPlainText: true }}
      options={options}
      selectedOptions={selectedOptions}
      onChange={handleChange}
      placeholder={allLabel}
      isClearable
      aria-label={i18n.translate(
        'xpack.streams.entityCentricLab.entities.alertsFilter.ariaLabel',
        { defaultMessage: 'Filter resources by alert status' }
      )}
      data-test-subj="entityCentricLabAlertsFilter"
      style={{ minWidth: 200 }}
    />
  );
};
