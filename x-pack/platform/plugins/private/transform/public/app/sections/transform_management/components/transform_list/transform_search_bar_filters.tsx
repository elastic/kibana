/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { SearchFilterConfig } from '@elastic/eui';
import {
  EuiFilterButton,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  type EuiSelectableOption,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { CustomComponentProps } from '@elastic/eui/src/components/search_bar/filters/custom_component_filter';
import type { Clause, Value } from '@elastic/eui/src/components/search_bar/query/ast';
import { i18n } from '@kbn/i18n';
import {
  TRANSFORM_FUNCTION,
  TRANSFORM_MODE,
  TRANSFORM_STATE,
  TRANSFORM_HEALTH_STATUS,
  TRANSFORM_HEALTH_STATUS_COLOR_LABEL,
  type TransformFunction,
} from '../../../../../../common/constants';
import { isLatestTransform, isPivotTransform } from '../../../../../../common/types/transform';
import type { TransformListRow } from '../../../../common';
import { TransformHealthColoredDot } from './transform_health_colored_dot';

const TYPE_FILTER_FIELD = 'type';
const typeFilterOptions = [
  {
    value: TRANSFORM_FUNCTION.PIVOT,
    label: i18n.translate('xpack.transform.typeFilter.pivotLabel', {
      defaultMessage: 'Pivot',
    }),
  },
  {
    value: TRANSFORM_FUNCTION.LATEST,
    label: i18n.translate('xpack.transform.typeFilter.latestLabel', {
      defaultMessage: 'Latest',
    }),
  },
];

export const TransformTypeFilter = ({ query, onChange }: CustomComponentProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverTitleId = useGeneratedHtmlId();
  const selectedType = query.getSimpleFieldClause(TYPE_FILTER_FIELD)?.value;
  const options: EuiSelectableOption[] = typeFilterOptions.map(({ value, label }) => ({
    label,
    checked: selectedType === value ? 'on' : undefined,
    key: value,
    data: { value },
  }));
  const filterName = i18n.translate('xpack.transform.typeFilter', { defaultMessage: 'Type' });

  return (
    <EuiPopover
      button={
        <EuiFilterButton
          aria-label={i18n.translate('xpack.transform.typeFilter.buttonAriaLabel', {
            defaultMessage: 'Type Selection',
          })}
          grow
          hasActiveFilters={selectedType !== undefined}
          iconSide="right"
          iconType="chevronSingleDown"
          isSelected={selectedType !== undefined}
          numActiveFilters={selectedType === undefined ? undefined : 1}
          onClick={() => setIsPopoverOpen((isOpen) => !isOpen)}
        >
          {filterName}
        </EuiFilterButton>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downCenter"
      aria-labelledby={popoverTitleId}
    >
      <EuiPopoverTitle id={popoverTitleId} paddingSize="s">
        {i18n.translate('xpack.transform.typeFilter.popoverTitle', {
          defaultMessage: 'Select transform type',
        })}
      </EuiPopoverTitle>
      <EuiSelectable
        aria-label={filterName}
        options={options}
        singleSelection
        listProps={{ paddingSize: 's' }}
        onChange={(_options, _event, changedOption) => {
          const value = changedOption.data?.value;
          if (typeof value !== 'string') {
            return;
          }

          let nextQuery = query.removeSimpleFieldClauses(TYPE_FILTER_FIELD);
          if (changedOption.checked === 'on') {
            nextQuery = nextQuery.addSimpleFieldValue(TYPE_FILTER_FIELD, value);
          }
          onChange?.(nextQuery);
          setIsPopoverOpen(false);
        }}
      >
        {(list) => list}
      </EuiSelectable>
    </EuiPopover>
  );
};

export const getTransformType = (transform: TransformListRow): TransformFunction | undefined => {
  if (isLatestTransform(transform.config)) {
    return TRANSFORM_FUNCTION.LATEST;
  }
  if (isPivotTransform(transform.config)) {
    return TRANSFORM_FUNCTION.PIVOT;
  }
};

export const transformFilters: SearchFilterConfig[] = [
  {
    type: 'field_value_selection',
    field: 'stats.health.status',
    name: i18n.translate('xpack.transform.healthFilter', { defaultMessage: 'Health' }),
    multiSelect: false,
    options: Object.values(TRANSFORM_HEALTH_STATUS).map((val) => ({
      value: val,
      name: TRANSFORM_HEALTH_STATUS_COLOR_LABEL[val],
      view: <TransformHealthColoredDot compact={true} showToolTip={false} healthStatus={val} />,
    })),
  },
  { type: 'custom_component', component: TransformTypeFilter },
  {
    type: 'field_value_selection',
    field: 'stats.state',
    name: i18n.translate('xpack.transform.statusFilter', { defaultMessage: 'Status' }),
    multiSelect: 'or',
    options: Object.values(TRANSFORM_STATE).map((val) => ({
      value: val,
      name: val,
    })),
  },
  {
    type: 'field_value_selection',
    field: 'mode',
    name: i18n.translate('xpack.transform.executionFilter', { defaultMessage: 'Execution' }),
    multiSelect: false,
    options: [
      {
        value: TRANSFORM_MODE.BATCH,
        name: i18n.translate('xpack.transform.executionFilter.oneTimeLabel', {
          defaultMessage: 'One-time',
        }),
      },
      {
        value: TRANSFORM_MODE.CONTINUOUS,
        name: i18n.translate('xpack.transform.executionFilter.continuousLabel', {
          defaultMessage: 'Continuous',
        }),
      },
    ],
  },
];

function stringMatch(str: string | undefined, substr: any) {
  try {
    return (
      typeof str === 'string' &&
      typeof substr === 'string' &&
      (str.toLowerCase().match(substr.toLowerCase()) === null) === false
    );
  } catch (error) {
    return false;
  }
}

export const filterTransforms = (transforms: TransformListRow[], clauses: Clause[]) => {
  // keep count of the number of matches we make as we're looping over the clauses
  // we only want to return transforms which match all clauses, i.e. each search term is ANDed
  // { transform-one:  { transform: { id: transform-one, config: {}, state: {}, ... }, count: 0 }, transform-two: {...} }
  const matches: Record<string, any> = transforms.reduce((p: Record<string, any>, c) => {
    p[c.id] = {
      transform: c,
      count: 0,
    };
    return p;
  }, {});

  clauses.forEach((c) => {
    // the search term could be negated with a minus, e.g. -bananas
    const bool = c.match === 'must';
    let ts = [];

    if (c.type === 'term') {
      // filter term based clauses, e.g. bananas
      // match on ID and description
      // if the term has been negated, AND the matches
      if (bool === true) {
        ts = transforms.filter(
          (transform) =>
            stringMatch(transform.id, c.value) === bool ||
            stringMatch(transform.config.description, c.value) === bool
        );
      } else {
        ts = transforms.filter(
          (transform) =>
            stringMatch(transform.id, c.value) === bool &&
            stringMatch(transform.config.description, c.value) === bool
        );
      }
    } else {
      // Filter status clauses, whose value is an array when multi-select is enabled.
      if (c.type === 'field' && c.field === 'stats.state' && Array.isArray(c.value)) {
        // the status value is an array of string(s) e.g. ['failed', 'stopped']
        ts = transforms.filter(
          (transform) => transform.stats && (c.value as Value[]).includes(transform.stats.state)
        );
      } else {
        ts = transforms.filter((transform) => {
          if (c.type === 'field' && c.field === 'stats.health.status') {
            return transform.stats?.health?.status === c.value;
          }
          if (c.type === 'field' && c.field === 'stats.state') {
            return transform.stats?.state === c.value;
          }
          if (c.type === 'field' && c.field === 'mode') {
            return transform.mode === c.value;
          }
          if (c.type === 'field' && c.field === 'type') {
            return getTransformType(transform) === c.value;
          }
          return false;
        });
      }
    }

    ts.forEach((t) => matches[t.id].count++);
  });

  // loop through the matches and return only transforms which have match all the clauses
  const filtered = Object.values(matches)
    .filter((m) => (m && m.count) >= clauses.length)
    .map((m) => m.transform);

  return filtered;
};
