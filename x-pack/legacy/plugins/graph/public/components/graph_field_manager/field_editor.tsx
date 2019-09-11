/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import {
  EuiPopover,
  EuiFormRow,
  EuiBadge,
  EuiComboBox,
  EuiColorPicker,
  EuiFieldNumber,
} from '@elastic/eui';
import { GraphFieldManagerProps } from '.';
import { WorkspaceField } from '../../types';
import { iconChoices } from '../../services/style_choices';
import { LegacyIcon } from '../graph_settings/legacy_icon';

export type FieldPickerProps = GraphFieldManagerProps & { field: WorkspaceField };

export function FieldEditor({ field, updateFieldProperties, selectField, deselectField, allFields }: FieldPickerProps) {
  const [open, setOpen] = useState(false);

  const { color, hopSize, icon, name: fieldName } = field;

  return (
    <EuiPopover
      id="graphFieldPicker"
      anchorPosition="downLeft"
      ownFocus
      button={<EuiBadge>{field.name}</EuiBadge>}
      isOpen={open}
      closePopover={() => setOpen(false)}
    >
      <EuiFormRow label="Field">
        <EuiComboBox
          onChange={choices => {
            // value is always defined because it's an unclearable single selection
            const newFieldName = choices[0].value!;

            deselectField(fieldName);
            selectField(newFieldName);
            updateFieldProperties(newFieldName, { color, hopSize, icon });
          }}
          singleSelection={{ asPlainText: true }}
          isClearable={false}
          options={toOptions(allFields, field)}
          selectedOptions={[{ value: field.name, label: field.name }]}
        />
      </EuiFormRow>

      <EuiFormRow label="Color">
        <EuiColorPicker color={color} onChange={newColor => {
            updateFieldProperties(fieldName, { color: newColor, hopSize, icon });
        }} />
      </EuiFormRow>

      <EuiFormRow label="Icon">
        <div>
          {iconChoices.map(currentIcon => (
            <LegacyIcon key={currentIcon.class} selected={currentIcon === icon} icon={currentIcon} onClick={() => {
                updateFieldProperties(fieldName, { color, hopSize, icon: currentIcon });
            }} />
          ))}
        </div>
      </EuiFormRow>

      <EuiFormRow label="Max hops">
        <EuiFieldNumber />
      </EuiFormRow>
    </EuiPopover>
  );
}

function toOptions(
  fields: WorkspaceField[],
  currentField: WorkspaceField
): Array<{ label: string; value: string }> {
  return fields
    .filter(field => !field.selected || field === currentField)
    .map(field => ({
      label: field.name,
      value: field.name,
    }));
}
