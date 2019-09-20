/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, ReactNode } from 'react';
import { EuiPopover, EuiSelectable, EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { WorkspaceField } from '../../types';

import { FieldIcon } from './field_icon';

export interface FieldPickerProps {
  fieldMap: Record<string, WorkspaceField>;
  selectField: (fieldName: string) => void;
  deselectField: (fieldName: string) => void;
}

export function FieldPicker({ fieldMap, selectField, deselectField }: FieldPickerProps) {
  const [open, setOpen] = useState(false);

  const allFields = Object.values(fieldMap);
  const unselectedFields = allFields.filter(field => !field.selected);
  const hasSelectedFields = unselectedFields.length < allFields.length;

  const [fieldOptions, setFieldOptions] = useState(toOptions(allFields));

  useEffect(() => {
    if (!open) {
      // only update the field options if the popover is not open currently.
      // This is necessary because EuiSelectable assumes options don't change
      // on their own.
      setFieldOptions(toOptions(allFields));
    }
  }, [fieldMap]);

  const badgeDescription = hasSelectedFields
    ? i18n.translate('xpack.graph.bar.pickMoreFieldsLabel', {
        defaultMessage: 'Add more fields',
      })
    : i18n.translate('xpack.graph.bar.pickFieldsLabel', {
        defaultMessage: 'Add fields',
      });

  return (
    <EuiPopover
      id="graphFieldPicker"
      anchorPosition="downLeft"
      ownFocus
      panelPaddingSize="none"
      button={
        <EuiBadge
          className="gphFieldPicker__button"
          color="hollow"
          iconType="plusInCircleFilled"
          onClick={() => setOpen(true)}
          onClickAriaLabel={badgeDescription}
          title=""
        >
          {badgeDescription}
        </EuiBadge>
      }
      isOpen={open}
      closePopover={() => setOpen(false)}
      panelClassName="gphFieldPicker__list"
    >
      {open && (
        <EuiSelectable
          searchProps={{
            placeholder: i18n.translate('xpack.graph.fieldManager.fieldSearchPlaceholder', {
              defaultMessage: 'Filter fields',
            }),
          }}
          searchable
          options={fieldOptions}
          onChange={newOptions => {
            newOptions.forEach(option => {
              if (option.checked === 'on' && !fieldMap[option.label].selected) {
                selectField(option.label);
              } else if (option.checked !== 'on' && fieldMap[option.label].selected) {
                deselectField(option.label);
              }
            });
            setFieldOptions(newOptions);
          }}
        >
          {(list, search) => (
            <>
              {search}
              {list}
            </>
          )}
        </EuiSelectable>
      )}
    </EuiPopover>
  );
}

function toOptions(
  fields: WorkspaceField[]
): Array<{ label: string; checked?: 'on' | 'off'; prepend?: ReactNode }> {
  return fields.map(field => ({
    label: field.name,
    prepend: <FieldIcon type={field.type} />,
    checked: field.selected ? 'on' : undefined,
  }));
}
