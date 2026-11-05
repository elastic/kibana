/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CatalogueMapField } from '@kbn/streams-schema';
import { FieldControl } from '../field_control';
import { useRowKeys } from '../use_row_keys';
import { isObjectValue, joinPointer, type FormValue, type ObjectValue } from '../values';
import { RemoveButton } from './remove_button';

const removeEntryLabel = i18n.translate('xpack.streams.componentDefinitionForm.map.remove', {
  defaultMessage: 'Remove entry',
});

interface MapRow {
  key: string;
  value: FormValue | undefined;
}

const rowsFromValue = (value: FormValue | undefined): MapRow[] =>
  isObjectValue(value) ? Object.entries(value).map(([key, item]) => ({ key, value: item })) : [];

const valueFromRows = (rows: readonly MapRow[]): ObjectValue => {
  const result: ObjectValue = {};
  for (const row of rows) {
    if (row.value !== undefined) {
      result[row.key] = row.value;
    }
  }
  return result;
};

interface MapControlProps {
  field: CatalogueMapField;
  value: FormValue | undefined;
  onChange: (value: FormValue | undefined) => void;
  pointer: string;
}

export function MapControl({ field, value, onChange, pointer }: MapControlProps) {
  const [rows, setRows] = useState<MapRow[]>(() => rowsFromValue(value));
  const rowKeys = useRowKeys(rows.length);
  const canAdd = field.max_entries === undefined || rows.length < field.max_entries;

  const update = (next: MapRow[]) => {
    setRows(next);
    onChange(valueFromRows(next));
  };

  return (
    <div>
      {rows.length > 0 ? (
        <EuiPanel color="subdued" paddingSize="m" hasShadow={false}>
          {rows.map((row, index) => (
            <React.Fragment key={rowKeys.keys[index]}>
              {index > 0 ? <EuiSpacer size="s" /> : null}
              <EuiFlexGroup gutterSize="s" responsive={false} alignItems="flexStart">
                <EuiFlexItem grow={1}>
                  <EuiFieldText
                    compressed
                    fullWidth
                    aria-label={i18n.translate('xpack.streams.componentDefinitionForm.map.key', {
                      defaultMessage: 'Key',
                    })}
                    value={row.key}
                    onChange={(event) =>
                      update(
                        rows.map((current, position) =>
                          position === index ? { ...current, key: event.target.value } : current
                        )
                      )
                    }
                    data-test-subj="componentDefinitionFormMapKey"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={2}>
                  <FieldControl
                    field={field.value_schema}
                    value={row.value}
                    onChange={(next) =>
                      update(
                        rows.map((current, position) =>
                          position === index ? { ...current, value: next } : current
                        )
                      )
                    }
                    pointer={joinPointer(pointer, row.key)}
                    scope={{}}
                    required
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <RemoveButton
                    label={removeEntryLabel}
                    onClick={() => {
                      rowKeys.remove(index);
                      update(rows.filter((_, position) => position !== index));
                    }}
                    dataTestSubj="componentDefinitionFormMapRemove"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </React.Fragment>
          ))}
        </EuiPanel>
      ) : null}
      <EuiButtonEmpty
        flush="left"
        size="s"
        isDisabled={!canAdd}
        onClick={() => update([...rows, { key: '', value: undefined }])}
        data-test-subj={`componentDefinitionFormMapAdd-${field.name ?? 'entries'}`}
      >
        {i18n.translate('xpack.streams.componentDefinitionForm.map.add', {
          defaultMessage: 'Add entry',
        })}
      </EuiButtonEmpty>
    </div>
  );
}
