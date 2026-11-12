/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { memo, useCallback, useMemo, useState } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import type { ObservableTypesConfiguration } from '../../../common/types/domain';
import type { ObservableTypePath } from '../../../common/observables/default_observable_types';
import { DEFAULT_OBSERVABLE_TYPES } from '../../../common/observables/default_observable_types';
import {
  getCustomObservableTypes,
  resolveObservableTypes,
  toBuiltinOverride,
} from '../../../common/observables/resolve_observable_types';
import { DeleteConfirmationModal } from '../configure_cases/delete_confirmation_modal';
import { ObservableTypePathsTable } from './observable_type_paths_table';
import * as configureCasesI18n from '../configure_cases/translations';
import * as i18n from './translations';

export interface ObservableTypesTableProps {
  observableTypes: ObservableTypesConfiguration;
  disabled: boolean;
  onChange: (observableTypes: ObservableTypesConfiguration) => void;
  onEditObservableType: (key: string) => void;
  onDeleteObservableType: (key: string) => void;
}

interface ObservableTypeRow {
  key: string;
  label: string;
  valuePattern?: string;
  paths: readonly ObservableTypePath[];
  isBuiltin: boolean;
}

const DEFAULT_TYPES = Object.values(DEFAULT_OBSERVABLE_TYPES);

const DEFAULT_PATHS_BY_KEY = new Map(
  DEFAULT_TYPES.map(({ key, paths }) => [key, new Set(paths.map(({ path }) => path))])
);

const ObservableTypesTableComponent: React.FC<ObservableTypesTableProps> = ({
  observableTypes,
  disabled,
  onChange,
  onEditObservableType,
  onDeleteObservableType,
}) => {
  const [expandedKeys, setExpandedKeys] = useState<ReadonlySet<string>>(new Set());
  const [typeToDelete, setTypeToDelete] = useState<ObservableTypeRow | null>(null);

  const customTypes = useMemo(() => getCustomObservableTypes(observableTypes), [observableTypes]);
  const overrides = useMemo(
    () => observableTypes.filter(({ key }) => key in DEFAULT_OBSERVABLE_TYPES),
    [observableTypes]
  );
  const resolvedTypes = useMemo(
    () => resolveObservableTypes(DEFAULT_OBSERVABLE_TYPES, observableTypes),
    [observableTypes]
  );

  const rows: ObservableTypeRow[] = useMemo(
    () => [
      ...DEFAULT_TYPES.map(({ key, label, valuePattern }) => ({
        key,
        label,
        valuePattern,
        paths: resolvedTypes[key].paths,
        isBuiltin: true,
      })),
      ...customTypes.map(({ key, label, valuePattern, paths }) => ({
        key,
        label,
        valuePattern,
        paths: paths ?? [],
        isBuiltin: false,
      })),
    ],
    [customTypes, resolvedTypes]
  );

  const toggleRow = useCallback((key: string) => {
    setExpandedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const onChangeBuiltinPaths = useCallback(
    (changedKey: string, changedPaths: ObservableTypePath[]) => {
      const updatedOverrides = DEFAULT_TYPES.flatMap((defaultType) => {
        const paths =
          defaultType.key === changedKey ? changedPaths : resolvedTypes[defaultType.key].paths;
        const override = toBuiltinOverride(defaultType, paths);

        return override ? [{ ...override, label: defaultType.label }] : [];
      });

      onChange([...customTypes, ...updatedOverrides]);
    },
    [customTypes, onChange, resolvedTypes]
  );

  const onChangeCustomPaths = useCallback(
    (changedKey: string, changedPaths: ObservableTypePath[]) => {
      onChange([
        ...customTypes.map((customType) =>
          customType.key === changedKey ? { ...customType, paths: changedPaths } : customType
        ),
        ...overrides,
      ]);
    },
    [customTypes, onChange, overrides]
  );

  const onConfirmDelete = useCallback(() => {
    if (typeToDelete) {
      onDeleteObservableType(typeToDelete.key);
    }
    setTypeToDelete(null);
  }, [onDeleteObservableType, typeToDelete]);

  const columns: Array<EuiBasicTableColumn<ObservableTypeRow>> = useMemo(
    () => [
      {
        isExpander: true,
        width: '40px',
        name: (
          <EuiScreenReaderOnly>
            <span>{i18n.FIELDS_COLUMN}</span>
          </EuiScreenReaderOnly>
        ),
        render: (row: ObservableTypeRow) => {
          const isExpanded = expandedKeys.has(row.key);
          const ariaLabel = isExpanded ? i18n.HIDE_FIELDS(row.label) : i18n.SHOW_FIELDS(row.label);

          return (
            <EuiToolTip content={ariaLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType={isExpanded ? 'chevronSingleDown' : 'chevronSingleRight'}
                aria-label={ariaLabel}
                aria-expanded={isExpanded}
                onClick={() => toggleRow(row.key)}
                data-test-subj={`observable-type-expand-${row.key}`}
              />
            </EuiToolTip>
          );
        },
      },
      {
        field: 'label',
        name: i18n.NAME_COLUMN,
      },
      {
        name: i18n.VALUE_PATTERN_LABEL,
        render: (row: ObservableTypeRow) => (
          <span data-test-subj={`observable-type-value-pattern-${row.key}`}>
            {row.valuePattern ? <EuiCode>{row.valuePattern}</EuiCode> : i18n.NO_VALUE_PATTERN}
          </span>
        ),
      },
      {
        name: i18n.FIELDS_COLUMN,
        render: (row: ObservableTypeRow) => (
          <span data-test-subj={`observable-type-fields-count-${row.key}`}>
            {i18n.EXTRACTED_FIELDS_COUNT(
              row.paths.filter(({ enabled }) => enabled).length,
              row.paths.length
            )}
          </span>
        ),
      },
      {
        name: '',
        width: '80px',
        render: (row: ObservableTypeRow) =>
          row.isBuiltin ? null : (
            <EuiFlexGroup gutterSize="xs" responsive={false} justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={configureCasesI18n.EDIT_OBSERVABLE_TYPE}
                  disableScreenReaderOutput
                >
                  <EuiButtonIcon
                    iconType="pencil"
                    aria-label={configureCasesI18n.EDIT_OBSERVABLE_TYPE}
                    isDisabled={disabled}
                    onClick={() => onEditObservableType(row.key)}
                    data-test-subj={`${row.key}-observable-type-edit`}
                  />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={i18n.DELETE} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="minusCircle"
                    color="danger"
                    aria-label={i18n.DELETE}
                    isDisabled={disabled}
                    onClick={() => setTypeToDelete(row)}
                    data-test-subj={`${row.key}-observable-type-delete`}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
      },
    ],
    [disabled, expandedKeys, onEditObservableType, toggleRow]
  );

  const itemIdToExpandedRowMap = useMemo(
    () =>
      rows.reduce<Record<string, ReactNode>>((expandedRows, row) => {
        if (expandedKeys.has(row.key)) {
          expandedRows[row.key] = (
            <ObservableTypePathsTable
              typeKey={row.key}
              paths={row.paths}
              defaultPaths={DEFAULT_PATHS_BY_KEY.get(row.key)}
              disabled={disabled}
              onChange={(paths) =>
                row.isBuiltin
                  ? onChangeBuiltinPaths(row.key, paths)
                  : onChangeCustomPaths(row.key, paths)
              }
            />
          );
        }
        return expandedRows;
      }, {}),
    [disabled, expandedKeys, onChangeBuiltinPaths, onChangeCustomPaths, rows]
  );

  return (
    <div data-test-subj="observable-types-list">
      <EuiBasicTable
        tableCaption={i18n.OBSERVABLE_TYPES_TABLE_CAPTION}
        items={rows}
        itemId="key"
        columns={columns}
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        rowProps={(row: ObservableTypeRow) => ({ 'data-test-subj': `observable-type-${row.key}` })}
      />
      <EuiSpacer size="s" />
      <EuiButtonEmpty
        size="s"
        flush="left"
        iconType="refresh"
        isDisabled={disabled || overrides.length === 0}
        onClick={() => onChange(customTypes)}
        data-test-subj="observable-types-reset"
      >
        {i18n.RESET_TO_DEFAULTS}
      </EuiButtonEmpty>
      {typeToDelete ? (
        <DeleteConfirmationModal
          title={i18n.DELETE_OBSERVABLE_TYPE_TITLE(typeToDelete.label)}
          message={i18n.DELETE_OBSERVABLE_TYPE_DESCRIPTION}
          onCancel={() => setTypeToDelete(null)}
          onConfirm={onConfirmDelete}
        />
      ) : null}
    </div>
  );
};

ObservableTypesTableComponent.displayName = 'ObservableTypesTable';

export const ObservableTypesTable = memo(ObservableTypesTableComponent);
