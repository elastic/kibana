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
  isExternalSyncDirection,
  pullsFromExternal,
  resolveExternalSyncFieldRules,
} from '../../../common/utils/external_sync_fields';
import type { CaseConnectorMapping } from '../../containers/configure/types';
import { getEmptyValue } from '../empty_value';
import {
  EXTERNAL_SYNC_FIELD_LABELS,
  FIELD_CONFLICT_OPTIONS,
  toConflictStrategy,
  toDirectionOptions,
  USE_DEFAULT_CONFLICT,
} from './external_sync_options';
import * as i18n from './translations';
import { useGetExternalFieldCatalog } from './use_get_external_field_catalog';

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
        return <EuiText size="s">{EXTERNAL_SYNC_FIELD_LABELS.comments}</EuiText>;
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
      const missing = catalog.isSuccess && entry == null;

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
    [catalog.data, catalog.isSuccess, connector.name, isWebhook]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<Row>>>(
    () => [
      {
        field: 'field',
        name: i18n.FIELD_SYNC_COL_CASE_FIELD,
        render: (field: ExternalSyncField) => <strong>{EXTERNAL_SYNC_FIELD_LABELS[field]}</strong>,
      },
      {
        field: 'externalKey',
        name: (
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              {i18n.FIELD_SYNC_COL_EXTERNAL_FIELD(connector.name)}
            </EuiFlexItem>
            {catalog.isInitialLoading && (
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
            options={toDirectionOptions(EXTERNAL_SYNC_FIELD_DIRECTIONS[row.field])}
            onChange={(e) => {
              if (isExternalSyncDirection(e.target.value)) {
                update(row.field, { direction: e.target.value });
              }
            }}
            aria-label={i18n.FIELD_SYNC_DIRECTION_ARIA(EXTERNAL_SYNC_FIELD_LABELS[row.field])}
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
                {getEmptyValue()}
              </EuiText>
            );
          }
          return (
            <EuiSelect
              compressed
              fullWidth
              disabled={disabled || !pullsFromExternal(row.direction)}
              value={conflictStrategy ?? USE_DEFAULT_CONFLICT}
              options={FIELD_CONFLICT_OPTIONS}
              onChange={(e) =>
                update(row.field, { conflictStrategy: toConflictStrategy(e.target.value) })
              }
              aria-label={i18n.FIELD_SYNC_CONFLICT_ARIA(EXTERNAL_SYNC_FIELD_LABELS[row.field])}
              data-test-subj={`external-sync-conflict-${row.field}`}
            />
          );
        },
      },
    ],
    [
      catalog.isError,
      catalog.isInitialLoading,
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
