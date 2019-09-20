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
  // @ts-ignore
  EuiHighlight,
  EuiContextMenu,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiKeyboardAccessible,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import classNames from 'classnames';
import { WorkspaceField } from '../../types';
import { iconChoices } from '../../helpers/style_choices';
import { LegacyIcon } from '../legacy_icon';
import { FieldIcon } from './field_icon';
import { isEqual } from '../helpers';

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
  field: initialField,
  updateFieldProperties,
  selectField,
  deselectField,
  allFields,
}: FieldPickerProps) {
  const [open, setOpen] = useState(false);

  const [currentField, setCurrentField] = useState(initialField);

  const { color, hopSize, lastValidHopSize, icon, name: fieldName } = currentField;

  const isDisabled = initialField.hopSize === 0;

  // update local field copy if changed from the outside
  useEffect(() => {
    if (currentField !== initialField) {
      setCurrentField(initialField);
    }
  }, [initialField]);

  function updateField() {
    const { name, selected, type, ...updatableProperties } = currentField;
    if (fieldName !== initialField.name) {
      deselectField(initialField.name);
      selectField(fieldName);
    }
    updateFieldProperties({
      fieldName,
      fieldProperties: updatableProperties,
    });
    setOpen(false);
  }

  function updateProp<K extends UpdateableFieldProperties | 'name'>(
    name: K,
    value: WorkspaceField[K]
  ) {
    setCurrentField({
      ...currentField,
      [name]: value,
    });
  }

  function toggleDisabledState() {
    updateFieldProperties({
      fieldName: initialField.name,
      fieldProperties: {
        hopSize: isDisabled ? initialField.lastValidHopSize : 0,
        lastValidHopSize: isDisabled ? 0 : initialField.hopSize,
      },
    });
    setOpen(false);
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
      panelPaddingSize="none"
      button={
        <EuiBadge
          color={initialField.color}
          iconSide="right"
          className={classNames('gphFieldEditorBadge', {
            'gphFieldEditorBadge--disabled': isDisabled,
          })}
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
          <LegacyIcon className={'gphFieldEditorBadge__icon'} icon={initialField.icon} />
          {initialField.name}
        </EuiBadge>
      }
      isOpen={open}
      closePopover={() => setOpen(false)}
    >
      <EuiContextMenu
        initialPanelId="root"
        panels={[
          {
            id: 'root',
            items: [
              {
                name: i18n.translate('xpack.graph.fieldManager.displaySettingsLabel', {
                  defaultMessage: 'Edit display settings',
                }),
                icon: <EuiIcon type="pencil" size="m" />,
                panel: 'displaySettings',
              },
              {
                name: isDisabled
                  ? i18n.translate('xpack.graph.fieldManager.enableFieldLabel', {
                      defaultMessage: 'Enable',
                    })
                  : i18n.translate('xpack.graph.fieldManager.disableFieldLabel', {
                      defaultMessage: 'Temporarily disable',
                    }),
                icon: <EuiIcon type={isDisabled ? 'eye' : 'eyeClosed'} size="m" />,
                onClick: toggleDisabledState,
              },
              {
                name: i18n.translate('xpack.graph.fieldManager.deleteFieldLabel', {
                  defaultMessage: 'Delete field',
                }),
                icon: <EuiIcon type="trash" size="m" />,
                onClick: () => {
                  deselectField(initialField.name);
                  setOpen(false);
                },
              },
            ],
          },
          {
            id: 'displaySettings',
            title: i18n.translate('xpack.graph.fieldManager.displayFormTitle', {
              defaultMessage: 'Edit',
            }),
            width: 400,
            content: (
              <EuiFlexGroup
                direction="column"
                gutterSize="m"
                className="gphFieldEditor__displayForm"
              >
                {/* This is a workaround to prevent the field combo box from being focussed when opening the panel. */}
                <EuiKeyboardAccessible>
                  <span style={{ opacity: 0 }} onClick={() => {}} onKeyPress={() => {}} />
                </EuiKeyboardAccessible>
                <EuiFlexItem>
                  <EuiFormRow
                    display="columnCompressed"
                    label={i18n.translate('xpack.graph.fieldManager.fieldLabel', {
                      defaultMessage: 'Field',
                    })}
                  >
                    <EuiComboBox
                      onChange={choices => {
                        // value is always defined because it's an unclearable single selection
                        const newFieldName = choices[0].value!;

                        updateProp('name', newFieldName);
                      }}
                      singleSelection={{ asPlainText: true }}
                      isClearable={false}
                      options={toOptions(allFields, initialField)}
                      selectedOptions={[
                        {
                          value: currentField.name,
                          label: currentField.name,
                          type: currentField.type,
                        },
                      ]}
                      renderOption={(option, searchValue, contentClassName) => {
                        const { type, label } = option;
                        return (
                          <span className={contentClassName}>
                            <FieldIcon type={type!} />{' '}
                            <EuiHighlight search={searchValue}>{label}</EuiHighlight>
                          </span>
                        );
                      }}
                    />
                  </EuiFormRow>

                  <EuiFormRow
                    display="columnCompressed"
                    label={i18n.translate('xpack.graph.fieldManager.colorLabel', {
                      defaultMessage: 'Color',
                    })}
                  >
                    <EuiColorPicker
                      color={color}
                      onChange={newColor => {
                        updateProp('color', newColor);
                      }}
                    />
                  </EuiFormRow>

                  <EuiFormRow
                    display="columnCompressed"
                    label={i18n.translate('xpack.graph.fieldManager.iconLabel', {
                      defaultMessage: 'Icon',
                    })}
                  >
                    <EuiComboBox
                      fullWidth
                      singleSelection={{ asPlainText: true }}
                      isClearable={false}
                      renderOption={(option, searchValue, contentClassName) => {
                        const { label, value } = option;
                        return (
                          <span className={contentClassName}>
                            <LegacyIcon icon={value!} />{' '}
                            <EuiHighlight search={searchValue}>{label}</EuiHighlight>
                          </span>
                        );
                      }}
                      options={iconChoices.map(currentIcon => ({
                        label: currentIcon.label,
                        value: currentIcon,
                      }))}
                      selectedOptions={[
                        {
                          label: icon.label,
                          value: icon,
                        },
                      ]}
                      onChange={choices => {
                        updateProp('icon', choices[0].value!);
                      }}
                    />
                  </EuiFormRow>

                  <EuiFormRow
                    display="columnCompressed"
                    label={i18n.translate('xpack.graph.fieldManager.maxHopsLabel', {
                      defaultMessage: 'Maximum hops',
                    })}
                  >
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
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFlexGroup direction="row" justifyContent="flexEnd">
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        onClick={() => {
                          setCurrentField(initialField);
                          setOpen(false);
                        }}
                      >
                        {i18n.translate('xpack.graph.fieldManager.cancelLabel', {
                          defaultMessage: 'Cancel',
                        })}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        fill
                        disabled={isEqual(initialField, currentField)}
                        onClick={updateField}
                      >
                        {i18n.translate('xpack.graph.fieldManager.updateLabel', {
                          defaultMessage: 'Update',
                        })}
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            ),
          },
        ]}
      />
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
