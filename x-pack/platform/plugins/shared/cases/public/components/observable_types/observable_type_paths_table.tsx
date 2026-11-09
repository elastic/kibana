/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSwitch,
  EuiToolTip,
} from '@elastic/eui';
import {
  MAX_OBSERVABLE_TYPE_EXCLUDED_VALUES,
  MAX_OBSERVABLE_TYPE_EXCLUDED_VALUE_LENGTH,
  MAX_OBSERVABLE_TYPE_PATHS,
  MAX_OBSERVABLE_TYPE_PATH_LENGTH,
} from '../../../common/constants';
import type { ObservableTypePath } from '../../../common/observables/default_observable_types';
import * as i18n from './translations';

export interface ObservableTypePathsTableProps {
  typeKey: string;
  paths: readonly ObservableTypePath[];
  /** The paths that cannot be deleted, because they are the defaults of a built-in type. */
  defaultPaths?: ReadonlySet<string>;
  disabled: boolean;
  onChange: (paths: ObservableTypePath[]) => void;
}

const fullWidthCss = css`
  inline-size: 100%;
`;

const ObservableTypePathsTableComponent: React.FC<ObservableTypePathsTableProps> = ({
  typeKey,
  paths,
  defaultPaths,
  disabled,
  onChange,
}) => {
  const [newPath, setNewPath] = useState('');

  const trimmedNewPath = newPath.trim();
  const canAddPath =
    trimmedNewPath.length > 0 &&
    trimmedNewPath.length <= MAX_OBSERVABLE_TYPE_PATH_LENGTH &&
    paths.length < MAX_OBSERVABLE_TYPE_PATHS &&
    !paths.some(({ path }) => path === trimmedNewPath);

  const addPath = useCallback(() => {
    onChange([...paths, { path: trimmedNewPath, enabled: true }]);
    setNewPath('');
  }, [onChange, paths, trimmedNewPath]);

  const updateExcludedValues = useCallback(
    (path: string, excludedValues: string[]) =>
      onChange(
        paths.map((entry) => {
          if (entry.path !== path) {
            return entry;
          }
          const { excludedValues: previousValues, ...rest } = entry;
          return excludedValues.length > 0 ? { ...rest, excludedValues } : rest;
        })
      ),
    [onChange, paths]
  );

  const columns: Array<EuiBasicTableColumn<ObservableTypePath>> = useMemo(
    () => [
      {
        field: 'path',
        name: i18n.FIELD_NAME_ARIA_LABEL,
        'data-test-subj': 'observable-type-path-name',
      },
      {
        name: i18n.EXCLUDED_VALUES_COLUMN,
        render: ({ path, excludedValues = [] }: ObservableTypePath) => (
          <EuiComboBox
            aria-label={i18n.EXCLUDED_VALUES_FOR_FIELD(path)}
            placeholder={i18n.EXCLUDED_VALUES_PLACEHOLDER}
            noSuggestions
            compressed
            fullWidth
            isDisabled={disabled}
            selectedOptions={excludedValues.map((value) => ({ label: value }))}
            onChange={(options) =>
              updateExcludedValues(
                path,
                options.map(({ label }) => label)
              )
            }
            onCreateOption={(searchValue) => {
              const value = searchValue.trim();
              if (
                value.length === 0 ||
                value.length > MAX_OBSERVABLE_TYPE_EXCLUDED_VALUE_LENGTH ||
                excludedValues.length >= MAX_OBSERVABLE_TYPE_EXCLUDED_VALUES ||
                excludedValues.includes(value)
              ) {
                return false;
              }
              updateExcludedValues(path, [...excludedValues, value]);
            }}
            data-test-subj={`observable-type-path-excluded-values-${typeKey}-${path}`}
          />
        ),
      },
      {
        name: i18n.EXTRACT_COLUMN,
        width: '80px',
        render: ({ path, enabled }: ObservableTypePath) => (
          <EuiSwitch
            label={i18n.EXTRACT_FROM_FIELD(path)}
            showLabel={false}
            checked={enabled}
            disabled={disabled}
            compressed
            onChange={(event) =>
              onChange(
                paths.map((entry) =>
                  entry.path === path ? { ...entry, enabled: event.target.checked } : entry
                )
              )
            }
            data-test-subj={`observable-type-path-switch-${typeKey}-${path}`}
          />
        ),
      },
      {
        name: '',
        width: '48px',
        render: ({ path }: ObservableTypePath) =>
          defaultPaths?.has(path) ? null : (
            <EuiToolTip content={i18n.REMOVE_FIELD(path)} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="trash"
                color="danger"
                aria-label={i18n.REMOVE_FIELD(path)}
                isDisabled={disabled}
                onClick={() => onChange(paths.filter((entry) => entry.path !== path))}
                data-test-subj={`observable-type-path-remove-${typeKey}-${path}`}
              />
            </EuiToolTip>
          ),
      },
    ],
    [defaultPaths, disabled, onChange, paths, typeKey, updateExcludedValues]
  );

  return (
    <div css={fullWidthCss}>
      <EuiBasicTable
        tableCaption={i18n.FIELDS_TABLE_CAPTION}
        items={[...paths]}
        itemId="path"
        columns={columns}
        noItemsMessage={i18n.NO_FIELDS}
        compressed
        data-test-subj={`observable-type-paths-${typeKey}`}
      />
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiFieldText
            value={newPath}
            placeholder={i18n.FIELD_NAME_PLACEHOLDER}
            aria-label={i18n.FIELD_NAME_ARIA_LABEL}
            disabled={disabled}
            compressed
            onChange={(event) => setNewPath(event.target.value)}
            data-test-subj={`observable-type-path-input-${typeKey}`}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType="plusCircle"
            isDisabled={disabled || !canAddPath}
            onClick={addPath}
            data-test-subj={`observable-type-add-path-${typeKey}`}
          >
            {i18n.ADD_FIELD}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

ObservableTypePathsTableComponent.displayName = 'ObservableTypePathsTable';

export const ObservableTypePathsTable = memo(ObservableTypePathsTableComponent);
