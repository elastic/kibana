/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLoadingSpinner,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import type {
  ExternalSyncConflictStrategy,
  ExternalSyncDirection,
  ExternalSyncField,
  ExternalSyncFieldRules,
} from '../../../common/types/domain';
import { ConnectorTypes } from '../../../common/types/domain';
import {
  EXTERNAL_SYNC_FIELDS,
  EXTERNAL_SYNC_FIELD_DIRECTIONS,
  pullsFromExternal,
  resolveExternalSyncFieldRules,
} from '../../../common/utils/external_sync_fields';
import type { CaseConnectorMapping } from '../../containers/configure/types';
import * as i18n from './translations';
import {
  hasExternalFieldCatalog,
  useGetExternalFieldCatalog,
} from './use_get_external_field_catalog';

export interface FieldSyncTableProps {
  connector: { id: string; name: string; type: ConnectorTypes };
  mappings: CaseConnectorMapping[];
  rules?: ExternalSyncFieldRules;
  disabled: boolean;
  onChange: (rules: ExternalSyncFieldRules) => void;
}

interface Row {
  field: ExternalSyncField;
  direction: ExternalSyncDirection;
  conflictStrategy?: ExternalSyncConflictStrategy;
  externalKey?: string;
}

const CASE_FIELD_LABELS: Record<ExternalSyncField, string> = {
  title: i18n.FIELD_SYNC_FIELD_TITLE,
  description: i18n.FIELD_SYNC_FIELD_DESCRIPTION,
  status: i18n.FIELD_SYNC_FIELD_STATUS,
  tags: i18n.FIELD_SYNC_FIELD_TAGS,
  comments: i18n.FIELD_SYNC_FIELD_COMMENTS,
};

const DIRECTION_LABELS: Record<ExternalSyncDirection, string> = {
  both: i18n.FIELD_SYNC_DIRECTION_BOTH,
  push: i18n.FIELD_SYNC_DIRECTION_PUSH,
  pull: i18n.FIELD_SYNC_DIRECTION_PULL,
  off: i18n.FIELD_SYNC_DIRECTION_OFF,
};

const USE_DEFAULT = 'default';

const CONFLICT_OPTIONS = [
  { value: USE_DEFAULT, text: i18n.FIELD_SYNC_CONFLICT_DEFAULT },
  { value: 'kibana', text: i18n.CONFLICT_KEEP_KIBANA },
  { value: 'external', text: i18n.CONFLICT_KEEP_EXTERNAL },
];

const isDirection = (value: string): value is ExternalSyncDirection =>
  value === 'both' || value === 'push' || value === 'pull' || value === 'off';

const FieldSyncTableComponent: React.FC<FieldSyncTableProps> = ({
  connector,
  mappings,
  rules,
  disabled,
  onChange,
}) => {
  const catalog = useGetExternalFieldCatalog({
    connectorId: connector.id,
    connectorType: connector.type,
  });
  const catalogAvailable = hasExternalFieldCatalog(connector.type);
  const isWebhook = connector.type === ConnectorTypes.casesWebhook;

  const rows = useMemo<Row[]>(() => {
    const resolved = resolveExternalSyncFieldRules(rules);
    return EXTERNAL_SYNC_FIELDS.map((field) => {
      const mapping = mappings.find((entry) => entry.source === field);
      return {
        field,
        ...resolved[field],
        externalKey:
          mapping != null && mapping.target !== 'not_mapped' ? mapping.target : undefined,
      };
    });
  }, [mappings, rules]);

  const update = useCallback(
    (field: ExternalSyncField, patch: Partial<Omit<Row, 'field' | 'externalKey'>>) => {
      onChange(
        rows.map(({ field: rowField, direction, conflictStrategy }) => {
          const next =
            rowField === field
              ? { direction, conflictStrategy, ...patch }
              : { direction, conflictStrategy };
          return {
            field: rowField,
            direction: next.direction,
            ...(next.conflictStrategy != null ? { conflictStrategy: next.conflictStrategy } : {}),
          };
        })
      );
    },
    [onChange, rows]
  );

  const renderExternalField = useCallback(
    (row: Row) => {
      if (row.field === 'status') {
        return <EuiText size="s">{i18n.FIELD_SYNC_EXTERNAL_STATUS}</EuiText>;
      }
      if (row.field === 'comments') {
        return <EuiText size="s">{i18n.FIELD_SYNC_FIELD_COMMENTS}</EuiText>;
      }
      if (isWebhook) {
        return <EuiText size="s">{i18n.FIELD_SYNC_EXTERNAL_WEBHOOK}</EuiText>;
      }
      if (row.externalKey == null) {
        return (
          <EuiText size="s" color="subdued">
            {i18n.FIELD_SYNC_EXTERNAL_NOT_MAPPED}
          </EuiText>
        );
      }

      const entry = catalog.data?.get(row.externalKey);
      const missing = catalogAvailable && catalog.isSuccess && entry == null;

      return (
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            {entry != null ? (
              <EuiFlexGroup direction="column" gutterSize="none">
                <EuiFlexItem grow={false}>
                  <EuiText size="s">{entry.label}</EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiCode transparentBackground>{row.externalKey}</EuiCode>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <EuiCode transparentBackground>{row.externalKey}</EuiCode>
            )}
          </EuiFlexItem>
          {missing && (
            <EuiFlexItem grow={false}>
              <EuiIconTip
                type="warning"
                color="warning"
                content={i18n.FIELD_SYNC_EXTERNAL_MISSING(connector.name)}
                iconProps={{ 'data-test-subj': `external-sync-field-missing-${row.field}` }}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      );
    },
    [catalog.data, catalog.isSuccess, catalogAvailable, connector.name, isWebhook]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<Row>>>(
    () => [
      {
        field: 'field',
        name: i18n.FIELD_SYNC_COL_CASE_FIELD,
        render: (field: ExternalSyncField) => <strong>{CASE_FIELD_LABELS[field]}</strong>,
      },
      {
        field: 'externalKey',
        name: (
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              {i18n.FIELD_SYNC_COL_EXTERNAL_FIELD(connector.name)}
            </EuiFlexItem>
            {catalog.isLoading && catalogAvailable && (
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="s" data-test-subj="external-sync-field-catalog-loading" />
              </EuiFlexItem>
            )}
            {catalog.isError && (
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  type="warning"
                  color="subdued"
                  content={i18n.FIELD_SYNC_CATALOG_ERROR(connector.name)}
                  iconProps={{ 'data-test-subj': 'external-sync-field-catalog-error' }}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
        render: (_: unknown, row: Row) => renderExternalField(row),
      },
      {
        field: 'direction',
        name: i18n.FIELD_SYNC_COL_DIRECTION,
        render: (direction: ExternalSyncDirection, row: Row) => (
          <EuiSelect
            compressed
            fullWidth
            disabled={disabled}
            value={direction}
            options={EXTERNAL_SYNC_FIELD_DIRECTIONS[row.field].map((value) => ({
              value,
              text: DIRECTION_LABELS[value],
            }))}
            onChange={(e) => {
              if (isDirection(e.target.value)) {
                update(row.field, { direction: e.target.value });
              }
            }}
            aria-label={i18n.FIELD_SYNC_DIRECTION_ARIA(CASE_FIELD_LABELS[row.field])}
            data-test-subj={`external-sync-direction-${row.field}`}
          />
        ),
      },
      {
        field: 'conflictStrategy',
        name: i18n.FIELD_SYNC_COL_CONFLICT,
        render: (conflictStrategy: ExternalSyncConflictStrategy | undefined, row: Row) => {
          // Comments are appended, never overwritten, so there is nothing to resolve.
          if (
            row.field === 'comments' ||
            !EXTERNAL_SYNC_FIELD_DIRECTIONS[row.field].some(pullsFromExternal)
          ) {
            return (
              <EuiText size="s" color="subdued" aria-label={i18n.FIELD_SYNC_NOT_APPLICABLE}>
                {'—'}
              </EuiText>
            );
          }
          return (
            <EuiSelect
              compressed
              fullWidth
              disabled={disabled || !pullsFromExternal(row.direction)}
              value={conflictStrategy ?? USE_DEFAULT}
              options={CONFLICT_OPTIONS}
              onChange={(e) => {
                const value = e.target.value;
                update(row.field, {
                  conflictStrategy: value === 'kibana' || value === 'external' ? value : undefined,
                });
              }}
              aria-label={i18n.FIELD_SYNC_CONFLICT_ARIA(CASE_FIELD_LABELS[row.field])}
              data-test-subj={`external-sync-conflict-${row.field}`}
            />
          );
        },
      },
    ],
    [
      catalog.isError,
      catalog.isLoading,
      catalogAvailable,
      connector.name,
      disabled,
      renderExternalField,
      update,
    ]
  );

  return (
    <div data-test-subj="external-sync-field-table">
      <EuiTitle size="xxs">
        <h4>{i18n.FIELD_SYNC_TITLE}</h4>
      </EuiTitle>
      <EuiText size="xs" color="subdued">
        <p>{i18n.FIELD_SYNC_DESC(connector.name)}</p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiBasicTable
        compressed
        tableLayout="auto"
        tableCaption={i18n.FIELD_SYNC_CAPTION(connector.name)}
        items={rows}
        itemId="field"
        columns={columns}
        rowProps={(row) => ({ 'data-test-subj': `external-sync-field-row-${row.field}` })}
      />
    </div>
  );
};

FieldSyncTableComponent.displayName = 'FieldSyncTable';

export const FieldSyncTable = React.memo(FieldSyncTableComponent);
