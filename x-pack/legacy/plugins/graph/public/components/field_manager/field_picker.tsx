/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, ReactNode } from 'react';
import { EuiPopover, EuiSelectable, EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import classNames from 'classnames';
import { WorkspaceField } from '../../types';
import { FieldIcon } from '../../../../../../../src/plugins/kibana_react/public';

export interface FieldPickerProps {
  fieldMap: Record<string, WorkspaceField>;
  selectField: (fieldName: string) => void;
  deselectField: (fieldName: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function FieldPicker({
  fieldMap,
  selectField,
  deselectField,
  open,
  setOpen,
}: FieldPickerProps) {
  const allFields = Object.values(fieldMap);

  const hasFields = allFields.length > 0;

  const [fieldOptions, setFieldOptions] = useState(toOptions(allFields));

  useEffect(() => {
    if (!open) {
      // only update the field options if the popover is not open currently.
      // This is necessary because EuiSelectable assumes options don't change
      // on their own.
      setFieldOptions(toOptions(Object.values(fieldMap)));
    }
  }, [fieldMap, open]);

  const badgeDescription = i18n.translate('xpack.graph.bar.pickFieldsLabel', {
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
          data-test-subj="graph-add-field-button"
          className={classNames('gphFieldPicker__button', {
            'gphFieldPicker__button--disabled': !hasFields,
          })}
          color="hollow"
          iconType="plusInCircleFilled"
          aria-disabled={!hasFields}
          onClick={() => {
            if (hasFields) {
              setOpen(true);
            }
          }}
          onClickAriaLabel={badgeDescription}
        >
          {badgeDescription}
        </EuiBadge>
      }
      isOpen={open}
      closePopover={() => setOpen(false)}
      panelClassName="gphFieldPicker__popoverPanel"
    >
      {open && (
        <EuiSelectable
          searchProps={{
            placeholder: i18n.translate('xpack.graph.fieldManager.fieldSearchPlaceholder', {
              defaultMessage: 'Filter by',
            }),
            compressed: true,
            'data-test-subj': 'graph-field-search',
          }}
          listProps={{
            className: 'gphFieldPicker__selectableList',
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
  return (
    fields
      // don't show non-aggregatable fields, except for the case when they are already selected.
      // this is necessary to ensure backwards compatibility with existing workspaces that might
      // contain non-aggregatable fields.
      .filter(field => field.aggregatable || field.selected)
      .map(field => ({
        label: field.name,
        prepend: <FieldIcon type={field.type} size="m" useColor />,
        checked: field.selected ? 'on' : undefined,
      }))
  );
}
