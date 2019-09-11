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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { GraphFieldManagerProps } from '.';
import { WorkspaceField } from '../../types';

export function FieldPicker(props: GraphFieldManagerProps) {
  const [open, setOpen] = useState(false);
  const [fieldOptions, setFieldOptions] = useState(toOptions(props.allFields));

  const unselectedFields = props.allFields.filter(field => !field.selected);
  const hasSelectedFields = unselectedFields.length < props.allFields.length;

  useEffect(() => {
    setFieldOptions(toOptions(unselectedFields));
  }, [props.allFields]);

  return (
    <EuiPopover
      id="graphFieldPicker"
      anchorPosition="downLeft"
      ownFocus
      button={
        <EuiButtonEmpty size="xs" iconType="plusInCircle" onClick={() => setOpen(true)}>
          {hasSelectedFields
            ? i18n.translate('xpack.graph.bar.pickMoreFieldsLabel', {
                defaultMessage: 'Select more fields',
              })
            : i18n.translate('xpack.graph.bar.pickFieldsLabel', {
                defaultMessage: 'Select fields',
              })}
        </EuiButtonEmpty>
      }
      isOpen={open}
      closePopover={() => setOpen(false)}
    >
      <EuiSelectable searchable options={fieldOptions} onChange={setFieldOptions}>
        {(list, search) => (
          <Fragment>
            <EuiText size="xs">
              {i18n.translate('xpack.graph.fieldManager.updateFieldsDescription', {
                defaultMessage:
                  'Select the fields you want to explore. Each field will be a separate vertex type',
              })}
            </EuiText>
            <EuiSpacer />
            {search}
            {list}
            <EuiButton
              fill
              onClick={() => {
                fieldOptions.forEach((option, index) => {
                  if (option.checked) {
                    props.selectField(unselectedFields[index]);
                  }
                });
              }}
            >
              {i18n.translate('xpack.graph.fieldManager.addFieldsLabel', {
                defaultMessage: 'Add fields',
              })}
            </EuiButton>
          </Fragment>
        )}
      </EuiSelectable>
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
