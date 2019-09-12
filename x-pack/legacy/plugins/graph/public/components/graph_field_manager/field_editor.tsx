/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiPopover,
  EuiFormRow,
  EuiBadge,
  EuiComboBox,
  EuiColorPicker,
  EuiFieldNumber,
  EuiAccordion,
  EuiSwitch,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { WorkspaceField } from '../../types';
import { iconChoices } from '../../services/style_choices';
import { LegacyIcon } from '../graph_settings/legacy_icon';

export interface FieldPickerProps {
  field: WorkspaceField;
  allFields: WorkspaceField[];
  updateFieldProperties: (props: {
    fieldName: string;
    fieldProperties: Partial<
      Pick<WorkspaceField, 'hopSize' | 'lastValidHopSize' | 'color' | 'icon'>
    >;
  }) => void;
  selectField: (fieldName: string) => void;
  deselectField: (fieldName: string) => void;
}

export function FieldEditor({
  field,
  updateFieldProperties,
  selectField,
  deselectField,
  allFields,
}: FieldPickerProps) {
  const [open, setOpen] = useState(false);

  const { color, hopSize, lastValidHopSize, icon, name: fieldName } = field;

  const isDisabled = field.hopSize === 0;

  return (
    <EuiPopover
      id="graphFieldEditor"
      anchorPosition="downLeft"
      ownFocus
      button={
        <EuiBadge
          iconOnClick={() => {}}
          iconOnClickAriaLabel=""
          onClickAriaLabel=""
          onClick={() => setOpen(true)}
        >
          {field.name}
        </EuiBadge>
      }
      isOpen={open}
      closePopover={() => setOpen(false)}
    >
      <EuiFormRow
        label=""
        helpText={i18n.translate('xpack.graph.fieldManager.disabledDescription', {
          defaultMessage: "A disabled field won't show up in new searches",
        })}
      >
        <EuiSwitch
          label={i18n.translate('xpack.graph.fieldManager.disabledLabel', {
            defaultMessage: 'Disable field temporarily',
          })}
          checked={isDisabled}
          onChange={() => {
            if (isDisabled) {
              updateFieldProperties({
                fieldName,
                fieldProperties: {
                  hopSize: lastValidHopSize,
                  lastValidHopSize: 0,
                },
              });
            } else {
              updateFieldProperties({
                fieldName,
                fieldProperties: {
                  hopSize: 0,
                  lastValidHopSize: hopSize,
                },
              });
            }
          }}
        />
      </EuiFormRow>
      <EuiFormRow label="Field">
        <EuiComboBox
          onChange={choices => {
            // value is always defined because it's an unclearable single selection
            const newFieldName = choices[0].value!;

            deselectField(fieldName);
            selectField(newFieldName);
            updateFieldProperties({
              fieldName: newFieldName,
              fieldProperties: { color, hopSize, lastValidHopSize, icon },
            });
          }}
          singleSelection={{ asPlainText: true }}
          isClearable={false}
          options={toOptions(allFields, field)}
          selectedOptions={[{ value: field.name, label: field.name }]}
        />
      </EuiFormRow>

      <EuiFormRow label="Color">
        <EuiColorPicker
          color={color}
          onChange={newColor => {
            updateFieldProperties({ fieldName, fieldProperties: { color: newColor } });
          }}
        />
      </EuiFormRow>

      <EuiFormRow label="Icon">
        <div>
          {iconChoices.map(currentIcon => (
            <LegacyIcon
              key={currentIcon.class}
              selected={currentIcon === icon}
              icon={currentIcon}
              onClick={() => {
                updateFieldProperties({ fieldName, fieldProperties: { icon: currentIcon } });
              }}
            />
          ))}
        </div>
      </EuiFormRow>

      <EuiAccordion
        id="graphFieldEditorAdvancedSettings"
        buttonContent={i18n.translate('xpack.graph.fieldManager.advancedSettingsLabel', {
          defaultMessage: 'Advanced settings',
        })}
      >
        <EuiFormRow label="Max hops">
          <EuiFieldNumber
            step={1}
            min={1}
            value={isDisabled ? lastValidHopSize : hopSize}
            onChange={({ target: { valueAsNumber } }) => {
              const updatedHopSize = Number.isNaN(valueAsNumber) ? 1 : valueAsNumber;
              updateFieldProperties({
                fieldName,
                fieldProperties: {
                  hopSize: isDisabled ? 0 : updatedHopSize,
                  lastValidHopSize: isDisabled ? updatedHopSize : 0,
                },
              });
            }}
          />
        </EuiFormRow>
      </EuiAccordion>
      <EuiButtonEmpty
        color="danger"
        onClick={() => {
          deselectField(fieldName);
        }}
      >
        {i18n.translate('xpack.graph.fieldManager.removeButtonLabel', {
          defaultMessage: 'Remove',
        })}
      </EuiButtonEmpty>
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
