/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { CriteriaWithPagination, EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButtonEmpty,
  EuiCode,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import type {
  ExternalSyncFieldMapping,
  ExternalSyncFieldMappings,
  ConnectorTypes,
} from '../../../common/types/domain';
import {
  EXTERNAL_SYNC_MAPPABLE_CONTROLS,
  MAX_EXTERNAL_SYNC_FIELD_MAPPINGS,
  isExternalSyncDirection,
  pullsFromExternal,
} from '../../../common/utils/external_sync_fields';
import {
  getFieldSnakeKey,
  parseFieldDefinitionsToInlineFields,
} from '../../../common/utils/template_fields';
import type { CaseConnectorMapping } from '../../containers/configure/types';
import { useGetFieldDefinitions } from '../field_library/hooks/use_get_field_definitions';
import { useCreateFieldDefinition } from '../field_library/hooks/use_create_field_definition';
import { FieldDefinitionFlyout } from '../field_library/components/field_definition_flyout';
import {
  FIELD_CONFLICT_OPTIONS,
  toConflictStrategy,
  toDirectionOptions,
  USE_DEFAULT_CONFLICT,
} from './external_sync_options';
import * as i18n from './translations';
import type { ExternalFieldCatalogEntry } from './use_get_external_field_catalog';
import { useGetExternalFieldCatalog } from './use_get_external_field_catalog';

export interface ExternalFieldMappingTableProps {
  connector: { id: string; name: string; type: ConnectorTypes };
  owner: string;
  /** Static push mapping; its targets are already covered by the Field sync table. */
  mappings: CaseConnectorMapping[];
  value?: ExternalSyncFieldMappings;
  disabled: boolean;
  onChange: (mappings: ExternalSyncFieldMappings) => void;
}

interface Row extends ExternalFieldCatalogEntry {
  mapping?: ExternalSyncFieldMapping;
}

const NOT_SYNCED = '';
const PAGE_SIZE = 10;

const DIRECTION_OPTIONS = toDirectionOptions(['both', 'push', 'pull', 'off']);

const ExternalFieldMappingTableComponent: React.FC<ExternalFieldMappingTableProps> = ({
  connector,
  owner,
  mappings,
  value = [],
  disabled,
  onChange,
}) => {
  const [search, setSearch] = useState('');
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);

  const catalog = useGetExternalFieldCatalog({
    connectorId: connector.id,
    connectorType: connector.type,
  });
  const { data: definitions } = useGetFieldDefinitions({ owner, isGlobal: true });
  const { mutate: createFieldDefinition, isLoading: isCreating } = useCreateFieldDefinition({
    onSuccess: () => setIsFlyoutOpen(false),
  });

  // Global fields that store a plain value, keyed the way `extended_fields` stores them.
  const caseFieldOptions = useMemo(() => {
    const fields = parseFieldDefinitionsToInlineFields(definitions?.fieldDefinitions ?? []);
    return fields
      .filter((field) => EXTERNAL_SYNC_MAPPABLE_CONTROLS.has(field.control))
      .map((field) => ({
        value: getFieldSnakeKey(field.name, field.type),
        text: field.label ?? field.name,
      }))
      .sort((a, b) => a.text.localeCompare(b.text));
  }, [definitions]);

  const rows = useMemo<Row[]>(() => {
    const builtInTargets = new Set(mappings.map((mapping) => mapping.target));
    const byExternalField = new Map(value.map((mapping) => [mapping.externalField, mapping]));
    const needle = search.trim().toLowerCase();

    return Array.from(catalog.data?.values() ?? [])
      .filter((entry) => !builtInTargets.has(entry.key))
      .filter(
        (entry) =>
          needle === '' ||
          entry.label.toLowerCase().includes(needle) ||
          entry.key.toLowerCase().includes(needle)
      )
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((entry) => ({ ...entry, mapping: byExternalField.get(entry.key) }));
  }, [catalog.data, mappings, search, value]);

  const capReached = value.length >= MAX_EXTERNAL_SYNC_FIELD_MAPPINGS;

  const update = useCallback(
    (externalField: string, next: ExternalSyncFieldMapping | undefined) => {
      const others = value.filter((mapping) => mapping.externalField !== externalField);
      onChange(next == null ? others : [...others, next]);
    },
    [onChange, value]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<Row>>>(
    () => [
      {
        field: 'label',
        name: i18n.FIELD_SYNC_COL_EXTERNAL_FIELD(connector.name),
        render: (label: string, row: Row) => (
          <EuiFlexGroup direction="column" gutterSize="none">
            <EuiFlexItem grow={false}>
              <EuiText size="s">{label}</EuiText>
            </EuiFlexItem>
            {label !== row.key && (
              <EuiFlexItem grow={false}>
                <EuiCode transparentBackground>{row.key}</EuiCode>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
      },
      {
        field: 'mapping',
        name: i18n.FIELD_SYNC_COL_CASE_FIELD,
        render: (mapping: ExternalSyncFieldMapping | undefined, row: Row) => (
          <EuiSelect
            compressed
            fullWidth
            disabled={disabled || (mapping == null && capReached)}
            value={mapping?.caseField ?? NOT_SYNCED}
            options={[
              { value: NOT_SYNCED, text: i18n.EXTERNAL_FIELDS_NOT_SYNCED },
              ...caseFieldOptions,
            ]}
            onChange={(e) =>
              update(
                row.key,
                e.target.value === NOT_SYNCED
                  ? undefined
                  : {
                      externalField: row.key,
                      caseField: e.target.value,
                      direction: mapping?.direction ?? 'both',
                      ...(mapping?.conflictStrategy != null
                        ? { conflictStrategy: mapping.conflictStrategy }
                        : {}),
                    }
              )
            }
            aria-label={i18n.EXTERNAL_FIELDS_CASE_FIELD_ARIA(row.label)}
            data-test-subj={`external-field-mapping-case-field-${row.key}`}
          />
        ),
      },
      {
        field: 'mapping',
        name: i18n.FIELD_SYNC_COL_DIRECTION,
        render: (mapping: ExternalSyncFieldMapping | undefined, row: Row) =>
          mapping == null ? null : (
            <EuiSelect
              compressed
              fullWidth
              disabled={disabled}
              value={mapping.direction}
              options={DIRECTION_OPTIONS}
              onChange={(e) => {
                if (isExternalSyncDirection(e.target.value)) {
                  update(row.key, { ...mapping, direction: e.target.value });
                }
              }}
              aria-label={i18n.FIELD_SYNC_DIRECTION_ARIA(row.label)}
              data-test-subj={`external-field-mapping-direction-${row.key}`}
            />
          ),
      },
      {
        field: 'mapping',
        name: i18n.FIELD_SYNC_COL_CONFLICT,
        render: (mapping: ExternalSyncFieldMapping | undefined, row: Row) =>
          mapping == null || !pullsFromExternal(mapping.direction) ? null : (
            <EuiSelect
              compressed
              fullWidth
              disabled={disabled}
              value={mapping.conflictStrategy ?? USE_DEFAULT_CONFLICT}
              options={FIELD_CONFLICT_OPTIONS}
              onChange={(e) => {
                const strategy = toConflictStrategy(e.target.value);
                const { conflictStrategy, ...rest } = mapping;
                update(row.key, strategy != null ? { ...rest, conflictStrategy: strategy } : rest);
              }}
              aria-label={i18n.FIELD_SYNC_CONFLICT_ARIA(row.label)}
              data-test-subj={`external-field-mapping-conflict-${row.key}`}
            />
          ),
      },
    ],
    [capReached, caseFieldOptions, connector.name, disabled, update]
  );

  const pageOfRows = rows.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE);
  const isSearching = search.trim() !== '';

  return (
    <div data-test-subj="external-field-mapping-table">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h4>{i18n.EXTERNAL_FIELDS_TITLE}</h4>
          </EuiTitle>
        </EuiFlexItem>
        {catalog.isInitialLoading && (
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="s" data-test-subj="external-field-mapping-loading" />
          </EuiFlexItem>
        )}
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            iconType="plusCircle"
            disabled={disabled}
            onClick={() => setIsFlyoutOpen(true)}
            data-test-subj="external-field-mapping-create-field"
          >
            {i18n.EXTERNAL_FIELDS_CREATE_FIELD}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiText size="xs" color="subdued">
        <p>{i18n.EXTERNAL_FIELDS_DESC(connector.name)}</p>
      </EuiText>
      <EuiSpacer size="s" />

      {catalog.isError && (
        <EuiText size="s" color="subdued" data-test-subj="external-field-mapping-error">
          {i18n.FIELD_SYNC_CATALOG_ERROR(connector.name)}
        </EuiText>
      )}

      {catalog.isSuccess && rows.length === 0 && !isSearching && (
        <EuiText size="s" color="subdued" data-test-subj="external-field-mapping-empty">
          {i18n.EXTERNAL_FIELDS_EMPTY(connector.name)}
        </EuiText>
      )}

      {catalog.isSuccess && (rows.length > 0 || isSearching) && (
        <>
          <EuiFieldSearch
            compressed
            fullWidth
            placeholder={i18n.EXTERNAL_FIELDS_SEARCH(connector.name)}
            aria-label={i18n.EXTERNAL_FIELDS_SEARCH(connector.name)}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPageIndex(0);
            }}
            data-test-subj="external-field-mapping-search"
          />
          <EuiSpacer size="s" />
          {capReached && (
            <>
              <EuiText size="xs" color="subdued" data-test-subj="external-field-mapping-cap">
                {i18n.EXTERNAL_FIELDS_CAP(MAX_EXTERNAL_SYNC_FIELD_MAPPINGS)}
              </EuiText>
              <EuiSpacer size="s" />
            </>
          )}
          <EuiBasicTable
            compressed
            tableLayout="auto"
            tableCaption={i18n.EXTERNAL_FIELDS_CAPTION(connector.name)}
            items={pageOfRows}
            itemId="key"
            columns={columns}
            pagination={{
              pageIndex,
              pageSize: PAGE_SIZE,
              totalItemCount: rows.length,
              showPerPageOptions: false,
            }}
            onChange={(criteria: CriteriaWithPagination<Row>) => setPageIndex(criteria.page.index)}
            rowProps={(row) => ({ 'data-test-subj': `external-field-mapping-row-${row.key}` })}
          />
        </>
      )}

      {isFlyoutOpen && (
        <FieldDefinitionFlyout
          owner={owner}
          isSaving={isCreating}
          onClose={() => setIsFlyoutOpen(false)}
          onSave={({ name, description, definition, isGlobal }) =>
            createFieldDefinition({
              fieldDefinition: { name, description, definition, isGlobal, owner },
            })
          }
        />
      )}
    </div>
  );
};

ExternalFieldMappingTableComponent.displayName = 'ExternalFieldMappingTable';

export const ExternalFieldMappingTable = React.memo(ExternalFieldMappingTableComponent);
