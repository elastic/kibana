/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useId } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ListRow, TextField } from './fields';

const addLabel = (what: string) =>
  i18n.translate('xpack.customApp.editor.addItem', {
    defaultMessage: 'Add {what}',
    values: { what },
  });

const removeLabel = (what: string, position: number) =>
  i18n.translate('xpack.customApp.editor.removeItem', {
    defaultMessage: 'Remove {what} {position}',
    values: { what, position },
  });

// ---------------------------------------------------------------------------------------------

export interface OptionConfig {
  value: string;
  label?: string;
}

export const OptionsEditor = ({
  options,
  onChange,
}: {
  options: readonly OptionConfig[];
  onChange: (options: OptionConfig[]) => void;
}) => {
  const replace = (index: number, next: OptionConfig) =>
    onChange(options.map((option, position) => (position === index ? next : option)));

  return (
    <>
      {options.map((option, index) => (
        <ListRow
          key={index}
          removeLabel={removeLabel('option', index + 1)}
          onRemove={() => onChange(options.filter((_option, position) => position !== index))}
        >
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem>
              <TextField
                label={i18n.translate('xpack.customApp.editor.optionValue', {
                  defaultMessage: 'Value {position}',
                  values: { position: index + 1 },
                })}
                value={option.value}
                onChange={(value) => replace(index, { ...option, value })}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <TextField
                label={i18n.translate('xpack.customApp.editor.optionLabel', {
                  defaultMessage: 'Label {position}',
                  values: { position: index + 1 },
                })}
                value={option.label ?? ''}
                onChange={(label) => replace(index, { ...option, label: label || undefined })}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </ListRow>
      ))}
      <EuiButtonEmpty
        size="s"
        iconType="plusCircle"
        onClick={() => onChange([...options, { value: `option-${options.length + 1}` }])}
      >
        {addLabel(
          i18n.translate('xpack.customApp.editor.optionNoun', { defaultMessage: 'option' })
        )}
      </EuiButtonEmpty>
    </>
  );
};

// ---------------------------------------------------------------------------------------------

export interface ColumnConfig {
  field: string;
  label?: string;
}

/** Without a list of columns, a table shows every column of its query. */
export const ColumnsEditor = ({
  columns,
  onChange,
}: {
  columns: readonly ColumnConfig[] | undefined;
  onChange: (columns: ColumnConfig[] | undefined) => void;
}) => {
  const switchId = useId();
  const replace = (index: number, next: ColumnConfig) =>
    onChange((columns ?? []).map((column, position) => (position === index ? next : column)));

  return (
    <>
      <EuiSwitch
        id={switchId}
        compressed
        label={i18n.translate('xpack.customApp.editor.chooseColumns', {
          defaultMessage: 'Choose which columns to show',
        })}
        checked={columns !== undefined}
        onChange={(event) => onChange(event.target.checked ? [{ field: '' }] : undefined)}
      />
      <EuiSpacer size="s" />
      {columns === undefined ? (
        <EuiText size="xs" color="subdued">
          <p>
            {i18n.translate('xpack.customApp.editor.allColumns', {
              defaultMessage: 'Every column of the query is shown.',
            })}
          </p>
        </EuiText>
      ) : (
        <>
          {columns.map((column, index) => (
            <ListRow
              key={index}
              removeLabel={removeLabel('column', index + 1)}
              onRemove={() => onChange(columns.filter((_column, position) => position !== index))}
            >
              <EuiFlexGroup gutterSize="s" responsive={false}>
                <EuiFlexItem>
                  <TextField
                    label={i18n.translate('xpack.customApp.editor.columnField', {
                      defaultMessage: 'Column {position}',
                      values: { position: index + 1 },
                    })}
                    value={column.field}
                    onChange={(field) => replace(index, { ...column, field })}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <TextField
                    label={i18n.translate('xpack.customApp.editor.columnLabel', {
                      defaultMessage: 'Heading {position}',
                      values: { position: index + 1 },
                    })}
                    value={column.label ?? ''}
                    onChange={(label) => replace(index, { ...column, label: label || undefined })}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </ListRow>
          ))}
          <EuiButtonEmpty
            size="s"
            iconType="plusCircle"
            onClick={() => onChange([...columns, { field: '' }])}
          >
            {addLabel(
              i18n.translate('xpack.customApp.editor.columnNoun', { defaultMessage: 'column' })
            )}
          </EuiButtonEmpty>
        </>
      )}
    </>
  );
};
