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
  isColorDark,
  hexToRgb,
  EuiHorizontalRule,
  EuiSpacer,
  // @ts-ignore
  EuiHighlight,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import classNames from 'classnames';
import { WorkspaceField } from '../../types';
import { iconChoices } from '../../helpers/style_choices';
import { LegacyIcon } from '../legacy_icon';
import { FieldIcon } from './field_icon';

type UpdateableFieldProperties = 'hopSize' | 'lastValidHopSize' | 'color' | 'icon';
export interface FieldPickerProps {
  field: WorkspaceField;
  allFields: WorkspaceField[];
  updateFieldProperties: (props: {
    fieldName: string;
    fieldProperties: Partial<Pick<WorkspaceField, UpdateableFieldProperties>>;
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

  const darkColor = isColorDark(...hexToRgb(color));

  function updateProp<K extends UpdateableFieldProperties>(name: K, value: WorkspaceField[K]) {
    updateFieldProperties({
      fieldName,
      fieldProperties: {
        [name]: value,
      },
    });
  }

  function toggleDisabledState() {
    updateFieldProperties({
      fieldName,
      fieldProperties: {
        hopSize: isDisabled ? lastValidHopSize : 0,
        lastValidHopSize: isDisabled ? 0 : hopSize,
      },
    });
  }

  const badgeDescription = isDisabled
    ? i18n.translate('xpack.graph.fieldManager.disabledFieldBadgeDescription', {
        defaultMessage: 'Disabled field {field}: Click to configure. Shift+click to enable',
        values: { field: fieldName },
      })
    : i18n.translate('xpack.graph.fieldManager.fieldBadgeDescription', {
        defaultMessage: 'Field {field}: Click to configure. Shift+click to disable',
        values: { field: fieldName },
      });

  return (
    <EuiPopover
      id="graphFieldEditor"
      anchorPosition="downLeft"
      ownFocus
      initialFocus=".gphFieldEditor"
      panelClassName="gphFieldEditor"
      button={
        <EuiBadge
          className={classNames('gphFieldEditorBadge', {
            'gphFieldEditorBadge--disabled': isDisabled,
          })}
          iconOnClick={() => {}}
          iconOnClickAriaLabel=""
          onClickAriaLabel={badgeDescription}
          title=""
          onClick={e => {
            if (e.shiftKey) {
              toggleDisabledState();
            } else {
              setOpen(true);
            }
          }}
        >
          <div className="gphFieldEditorBadge__color" style={{ backgroundColor: color }}>
            <LegacyIcon
              className={classNames({
                'gphFieldEditorBadge__icon--dark': darkColor,
                'gphFieldEditorBadge__icon--light': !darkColor,
              })}
              icon={icon}
            />
          </div>
          {field.name}
        </EuiBadge>
      }
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
            updateFieldProperties({
              fieldName: newFieldName,
              fieldProperties: { color, hopSize, lastValidHopSize, icon },
            });
          }}
          singleSelection={{ asPlainText: true }}
          isClearable={false}
          options={toOptions(allFields, field)}
          selectedOptions={[{ value: field.name, label: field.name, type: field.type }]}
          renderOption={(option, searchValue, contentClassName) => {
            const { type, label } = option;
            return (
              <span className={contentClassName}>
                <FieldIcon type={type!} /> <EuiHighlight search={searchValue}>{label}</EuiHighlight>
              </span>
            );
          }}
        />
      </EuiFormRow>

      <EuiFormRow
        label=""
        helpText={i18n.translate('xpack.graph.fieldManager.disabledDescription', {
          defaultMessage:
            "A disabled field won't show up in new searches. You can also Shift+click on the badge to toggle the field.",
        })}
      >
        <EuiSwitch
          label={i18n.translate('xpack.graph.fieldManager.disabledLabel', {
            defaultMessage: 'Disable field temporarily',
          })}
          data-test-subj="graphFieldEditorDisable"
          checked={isDisabled}
          onChange={toggleDisabledState}
        />
      </EuiFormRow>

      <EuiFormRow label="Color">
        <EuiColorPicker
          color={color}
          onChange={newColor => {
            updateProp('color', newColor);
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
                updateProp('icon', currentIcon);
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
        <EuiSpacer />
        <EuiFormRow label="Max hops">
          <EuiFieldNumber
            step={1}
            min={1}
            value={isDisabled ? lastValidHopSize : hopSize}
            onChange={({ target: { valueAsNumber } }) => {
              const updatedHopSize = Number.isNaN(valueAsNumber) ? 1 : valueAsNumber;
              updateProp(isDisabled ? 'lastValidHopSize' : 'hopSize', updatedHopSize);
            }}
          />
        </EuiFormRow>
      </EuiAccordion>
      <EuiHorizontalRule />
      <EuiButtonEmpty
        data-test-subj="graphFieldEditorRemove"
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
): Array<{ label: string; value: string; type: string }> {
  return fields
    .filter(field => !field.selected || field === currentField)
    .map(({ name, type }) => ({
      label: name,
      value: name,
      type,
    }));
}
