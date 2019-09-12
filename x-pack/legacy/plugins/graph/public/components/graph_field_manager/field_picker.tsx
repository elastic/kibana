/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, Fragment, useEffect, ReactNode } from 'react';
import {
  EuiPopover,
  EuiButtonEmpty,
  EuiSelectable,
  EuiButton,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { WorkspaceField } from '../../types';

import { FieldIcon } from './field_icon';

export interface FieldPickerProps {
  allFields: WorkspaceField[];
  selectField: (fieldName: string) => void;
  deselectField: (fieldName: string) => void;
}

export function FieldPicker(props: FieldPickerProps) {
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
      <EuiSelectable
        searchable
        options={fieldOptions}
        onChange={setFieldOptions}
        className="gphFieldPickerList"
      >
        {(list, search) => (
          <Fragment>
            <EuiText size="xs">
              {i18n.translate('xpack.graph.fieldManager.updateFieldsDescription', {
                defaultMessage:
                  'Select the fields you want to explore. Each field will be a separate vertex type',
              })}
            </EuiText>
            <EuiSpacer size="s" />
            {search}
            {list}
            <EuiButton
              fill
              onClick={() => {
                setOpen(false);
                fieldOptions.forEach((option, index) => {
                  if (option.checked === 'on') {
                    props.selectField(unselectedFields[index].name);
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

function toOptions(
  fields: WorkspaceField[]
): Array<{ label: string; checked?: 'on' | 'off'; prepend?: ReactNode }> {
  return fields.map(field => ({
    label: field.name,
    prepend: <FieldIcon type={field.type} />,
  }));
}
