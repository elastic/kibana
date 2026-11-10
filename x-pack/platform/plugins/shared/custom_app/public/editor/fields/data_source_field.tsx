/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useId, useState } from 'react';
import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CASES_SEVERITIES, CASES_STATUSES } from '@kbn/custom-app-common';
import {
  DEFAULT_CASES_LIMIT,
  MAX_CASES_FILTER_LENGTH,
  MAX_CASES_LIMIT,
  type CasesSource,
  type StateDeclaration,
} from '@kbn/custom-app-common';
import { DEFAULT_QUERY } from '../node_defaults';
import { FormRow, SelectField, TextField } from './fields';
import { QueryField } from './query_field';

type Filter = CasesSource['status'];
type FilterKind = 'any' | 'value' | 'state';

/**
 * What kind a filter is. An empty text filters nothing, so it is "any", unless the author has just
 * chosen a fixed value and has not typed it yet, which would otherwise undo their choice.
 */
const kindOf = (filter: Filter, hasChosenValue: boolean): FilterKind => {
  if (filter === undefined) return 'any';
  if (typeof filter === 'object') return 'state';
  return filter === '' && !hasChosenValue ? 'any' : 'value';
};

interface CasesFilterFieldProps {
  label: string;
  filter: Filter;
  /** What a fixed value can be, when it is one of a few. Free text when absent. */
  options?: ReadonlyArray<{ value: string; text: string }>;
  stateKeys: readonly string[];
  onChange: (filter: Filter) => void;
}

/** A filter of the cases: none, a fixed value, or a value of the app, which an input then drives. */
const CasesFilterField = ({
  label,
  filter,
  options,
  stateKeys,
  onChange,
}: CasesFilterFieldProps) => {
  const [hasChosenValue, setHasChosenValue] = useState(false);
  const kind = kindOf(filter, hasChosenValue);

  return (
    <EuiFlexGroup gutterSize="s" alignItems="flexEnd" responsive={false} wrap>
      <EuiFlexItem css={{ minWidth: 130 }}>
        <SelectField<FilterKind>
          label={label}
          value={kind}
          options={[
            {
              value: 'any',
              text: i18n.translate('xpack.customApp.editor.filterAny', { defaultMessage: 'Any' }),
            },
            {
              value: 'value',
              text: i18n.translate('xpack.customApp.editor.filterValue', {
                defaultMessage: 'A fixed value',
              }),
            },
            {
              value: 'state',
              text: i18n.translate('xpack.customApp.editor.filterState', {
                defaultMessage: 'A value of the app',
              }),
            },
          ]}
          onChange={(next) => {
            setHasChosenValue(next === 'value');
            if (next === 'any') onChange(undefined);
            else if (next === 'value') onChange(options ? options[0].value : '');
            else onChange({ fromState: stateKeys[0] ?? '' });
          }}
        />
      </EuiFlexItem>
      {kind === 'value' && (
        <EuiFlexItem css={{ minWidth: 130 }}>
          {options ? (
            <SelectField
              label={i18n.translate('xpack.customApp.editor.filterValueOf', {
                defaultMessage: '{label} is',
                values: { label },
              })}
              value={typeof filter === 'string' ? filter : ''}
              options={options}
              onChange={onChange}
            />
          ) : (
            <TextField
              label={i18n.translate('xpack.customApp.editor.filterValueOf', {
                defaultMessage: '{label} is',
                values: { label },
              })}
              value={typeof filter === 'string' ? filter : ''}
              maxLength={MAX_CASES_FILTER_LENGTH}
              onChange={onChange}
            />
          )}
        </EuiFlexItem>
      )}
      {kind === 'state' && (
        <EuiFlexItem css={{ minWidth: 130 }}>
          <SelectField
            label={i18n.translate('xpack.customApp.editor.filterStateOf', {
              defaultMessage: '{label} follows',
              values: { label },
            })}
            value={typeof filter === 'object' ? filter.fromState : ''}
            placeholder={i18n.translate('xpack.customApp.editor.chooseValue', {
              defaultMessage: 'Choose a value',
            })}
            options={stateKeys.map((key) => ({ value: key, text: key }))}
            onChange={(key) => onChange({ fromState: key })}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const statusOptions = [
  {
    value: 'open',
    text: i18n.translate('xpack.customApp.editor.statusOpen', { defaultMessage: 'Open' }),
  },
  {
    value: 'in-progress',
    text: i18n.translate('xpack.customApp.editor.statusInProgress', {
      defaultMessage: 'In progress',
    }),
  },
  {
    value: 'closed',
    text: i18n.translate('xpack.customApp.editor.statusClosed', { defaultMessage: 'Closed' }),
  },
] satisfies ReadonlyArray<{ value: (typeof CASES_STATUSES)[number]; text: string }>;

const severityOptions = [
  {
    value: 'low',
    text: i18n.translate('xpack.customApp.editor.severityLow', { defaultMessage: 'Low' }),
  },
  {
    value: 'medium',
    text: i18n.translate('xpack.customApp.editor.severityMedium', { defaultMessage: 'Medium' }),
  },
  {
    value: 'high',
    text: i18n.translate('xpack.customApp.editor.severityHigh', { defaultMessage: 'High' }),
  },
  {
    value: 'critical',
    text: i18n.translate('xpack.customApp.editor.severityCritical', { defaultMessage: 'Critical' }),
  },
] satisfies ReadonlyArray<{ value: (typeof CASES_SEVERITIES)[number]; text: string }>;

const sortOptions = [
  {
    value: 'updated_at' as const,
    text: i18n.translate('xpack.customApp.editor.sortUpdated', { defaultMessage: 'Last updated' }),
  },
  {
    value: 'created_at' as const,
    text: i18n.translate('xpack.customApp.editor.sortCreated', { defaultMessage: 'Created' }),
  },
  {
    value: 'title' as const,
    text: i18n.translate('xpack.customApp.editor.sortTitle', { defaultMessage: 'Title' }),
  },
  {
    value: 'severity' as const,
    text: i18n.translate('xpack.customApp.editor.sortSeverity', { defaultMessage: 'Severity' }),
  },
  {
    value: 'status' as const,
    text: i18n.translate('xpack.customApp.editor.sortStatus', { defaultMessage: 'Status' }),
  },
];

interface CasesSourceEditorProps {
  source: CasesSource;
  stateKeys: readonly string[];
  /** Only a stat can show how many there are. */
  canCount: boolean;
  onChange: (source: CasesSource) => void;
}

const CasesSourceEditor = ({ source, stateKeys, canCount, onChange }: CasesSourceEditorProps) => {
  // Each switch has an id of its own: two without would be named after one another.
  const followTimeId = useId();
  const countId = useId();
  const sort = source.sort ?? { field: 'updated_at' as const, order: 'desc' as const };

  return (
    <>
      <CasesFilterField
        label={i18n.translate('xpack.customApp.editor.casesStatus', { defaultMessage: 'Status' })}
        filter={source.status}
        options={statusOptions}
        stateKeys={stateKeys}
        onChange={(status) => onChange({ ...source, status })}
      />
      <EuiSpacer size="s" />
      <CasesFilterField
        label={i18n.translate('xpack.customApp.editor.casesSeverity', {
          defaultMessage: 'Severity',
        })}
        filter={source.severity}
        options={severityOptions}
        stateKeys={stateKeys}
        onChange={(severity) => onChange({ ...source, severity })}
      />
      <EuiSpacer size="s" />
      <CasesFilterField
        label={i18n.translate('xpack.customApp.editor.casesSearch', { defaultMessage: 'Search' })}
        filter={source.search}
        stateKeys={stateKeys}
        onChange={(search) => onChange({ ...source, search })}
      />
      <EuiSpacer size="s" />
      <CasesFilterField
        label={i18n.translate('xpack.customApp.editor.casesTag', { defaultMessage: 'Tag' })}
        filter={source.tag}
        stateKeys={stateKeys}
        onChange={(tag) => onChange({ ...source, tag })}
      />
      {!source.count && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="s" responsive={false} wrap>
            <EuiFlexItem css={{ minWidth: 130 }}>
              <SelectField
                label={i18n.translate('xpack.customApp.editor.casesSortBy', {
                  defaultMessage: 'Sort by',
                })}
                value={sort.field}
                options={sortOptions}
                onChange={(field) => onChange({ ...source, sort: { ...sort, field } })}
              />
            </EuiFlexItem>
            <EuiFlexItem css={{ minWidth: 130 }}>
              <SelectField<'asc' | 'desc'>
                label={i18n.translate('xpack.customApp.editor.casesOrder', {
                  defaultMessage: 'Order',
                })}
                value={sort.order}
                options={[
                  {
                    value: 'desc',
                    text: i18n.translate('xpack.customApp.editor.orderDesc', {
                      defaultMessage: 'Newest or highest first',
                    }),
                  },
                  {
                    value: 'asc',
                    text: i18n.translate('xpack.customApp.editor.orderAsc', {
                      defaultMessage: 'Oldest or lowest first',
                    }),
                  },
                ]}
                onChange={(order) => onChange({ ...source, sort: { ...sort, order } })}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <FormRow
            label={i18n.translate('xpack.customApp.editor.casesLimit', {
              defaultMessage: 'How many at most',
            })}
            helpText={i18n.translate('xpack.customApp.editor.casesLimitHelp', {
              defaultMessage: 'Up to {max}, which is as many as are given at once.',
              values: { max: MAX_CASES_LIMIT },
            })}
          >
            <EuiFieldNumber
              compressed
              min={1}
              max={MAX_CASES_LIMIT}
              // Empty until it is told, so that it can be cleared to type another number.
              value={source.limit ?? ''}
              placeholder={String(DEFAULT_CASES_LIMIT)}
              aria-label={i18n.translate('xpack.customApp.editor.casesLimit', {
                defaultMessage: 'How many at most',
              })}
              onChange={(event) =>
                onChange({
                  ...source,
                  limit: event.target.value === '' ? undefined : Number(event.target.value),
                })
              }
            />
          </FormRow>
        </>
      )}
      <EuiSpacer size="m" />
      <EuiSwitch
        compressed
        id={followTimeId}
        label={i18n.translate('xpack.customApp.editor.casesFollowTime', {
          defaultMessage: 'Only the cases created in the period of the app',
        })}
        checked={source.followTimeRange === true}
        onChange={(event) =>
          onChange({ ...source, followTimeRange: event.target.checked ? true : undefined })
        }
      />
      {canCount && (
        <>
          <EuiSpacer size="s" />
          <EuiSwitch
            compressed
            id={countId}
            label={i18n.translate('xpack.customApp.editor.casesCount', {
              defaultMessage: 'Show how many there are',
            })}
            checked={source.count === true}
            onChange={(event) =>
              onChange({ ...source, count: event.target.checked ? true : undefined })
            }
          />
        </>
      )}
    </>
  );
};

type Kind = 'esql' | 'cases';

interface DataSourceFieldProps {
  query: string | undefined;
  source: CasesSource | undefined;
  /** The values of the app: the query can use them as `?name`, and a source can be filtered by them. */
  state: Readonly<Record<string, StateDeclaration>>;
  canCount?: boolean;
  /** What the component now gets its data from: one of the two is set, and the other is not. */
  onChange: (data: { query?: string; source?: CasesSource }) => void;
}

/** Where a component gets its data: a query, or the cases the user can see. */
export const DataSourceField = ({
  query,
  source,
  state,
  canCount = false,
  onChange,
}: DataSourceFieldProps) => {
  const kind: Kind = source ? 'cases' : 'esql';

  return (
    <>
      <SelectField<Kind>
        label={i18n.translate('xpack.customApp.editor.dataFrom', { defaultMessage: 'Data from' })}
        value={kind}
        options={[
          {
            value: 'esql',
            text: i18n.translate('xpack.customApp.editor.dataFromEsql', {
              defaultMessage: 'An ES|QL query',
            }),
          },
          {
            value: 'cases',
            text: i18n.translate('xpack.customApp.editor.dataFromCases', {
              defaultMessage: 'Cases',
            }),
          },
        ]}
        onChange={(next) =>
          next === 'cases'
            ? onChange({ query: undefined, source: { type: 'cases' } })
            : onChange({ query: DEFAULT_QUERY, source: undefined })
        }
      />
      <EuiSpacer size="s" />
      {source ? (
        <CasesSourceEditor
          source={source}
          stateKeys={Object.keys(state)}
          canCount={canCount}
          onChange={(next) => onChange({ source: next })}
        />
      ) : (
        <QueryField
          query={query ?? DEFAULT_QUERY}
          state={state}
          onChange={(next) => onChange({ query: next })}
        />
      )}
    </>
  );
};
