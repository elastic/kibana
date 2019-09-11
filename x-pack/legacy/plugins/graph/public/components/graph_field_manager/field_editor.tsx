/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment, useEffect } from 'react';
import {
  EuiPopover,
  EuiButtonEmpty,
  EuiSelectable,
  EuiButton,
  EuiText,
  EuiSpacer,
  EuiFormRow,
  EuiBadge,
  EuiComboBox,
  EuiColorPicker,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { GraphFieldManagerProps } from '.';
import { WorkspaceField } from '../../types';

export type FieldPickerProps = GraphFieldManagerProps & { field: WorkspaceField };

export function FieldEditor({ field, updateFieldProperties, allFields }: FieldPickerProps) {
  const [open, setOpen] = useState(false);

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
        <EuiComboBox selectedOptions={[{ label: 'category.keyword' }]} />
      </EuiFormRow>

      <EuiFormRow label="Color">
        <EuiColorPicker color="#ffffff" onChange={() => {}} />
      </EuiFormRow>

      <EuiFormRow label="Icon">
        <div>
          {iconChoices.map(icon => (
            <LegacyIcon key={icon.class} asListIcon icon={icon} onClick={() => {}} />
          ))}
        </div>
      </EuiFormRow>

      <EuiFormRow label="Max hops">
        <EuiFieldNumber />
      </EuiFormRow>
    </EuiPopover>
  );
}

function toOptions(fields: WorkspaceField[]): Array<{ label: string; checked?: 'on' | 'off' }> {
  return fields.map(field => ({
    label: field.name,
    checked: 'off',
    // TODO icon for data type
  }));
}
