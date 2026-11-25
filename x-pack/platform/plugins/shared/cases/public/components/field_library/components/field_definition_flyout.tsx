/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCheckbox,
  EuiCode,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { parse as parseYaml } from 'yaml';
import type { FieldDefinition } from '../../../../common/types/domain/field_definition/v1';
import {
  FieldType,
  InlineFieldSchema,
  isDisplayOnlyField,
  UserPickerDefaultSchema,
} from '../../../../common/types/domain/template/fields';
import { StrictInlineFieldSchema } from '../../../../common/types/domain/template/strict_fields';
import {
  type FieldDefaultValue,
  updateFieldDefinitionDefault,
  removeFieldDefinitionDefault,
} from '../../templates_v2/utils/update_yaml_field_default';
import { FieldDefinitionYamlEditor } from './field_definition_yaml_editor';
import { FieldDefinitionPreview } from './field_definition_preview';
import * as i18n from '../translations';

const EXAMPLE_FIELD_YAML = `name: my_field
label: "My Field"
control: INPUT_TEXT
type: keyword
`;

interface FieldDefinitionFlyoutProps {
  owner: string;
  fieldDefinition?: FieldDefinition;
  onSave: (params: {
    name: string;
    description: string;
    definition: string;
    isGlobal: boolean;
  }) => void;
  onClose: () => void;
  isSaving?: boolean;
}

export const FieldDefinitionFlyout: React.FC<FieldDefinitionFlyoutProps> = ({
  owner,
  fieldDefinition,
  onSave,
  onClose,
  isSaving = false,
}) => {
  const isEditing = !!fieldDefinition;
  const flyoutTitleId = useGeneratedHtmlId();

  const [description, setDescription] = useState(fieldDefinition?.description ?? '');
  const [definition, setDefinition] = useState(fieldDefinition?.definition ?? EXAMPLE_FIELD_YAML);
  const [isGlobal, setApplyToAllCases] = useState(fieldDefinition?.isGlobal ?? false);

  const definitionRef = useRef(definition);
  definitionRef.current = definition;

  const parsedDefinition = useMemo(() => {
    try {
      return InlineFieldSchema.safeParse(parseYaml(definition));
    } catch {
      return null;
    }
  }, [definition]);

  // On create the server enforces the authoring charset (strict); on update the server uses the
  // lenient schema because the name is immutable anyway. Mirror that split in the UI so the Save
  // button only enables when the definition matches what the server will accept.
  const isDefinitionValid = useMemo(() => {
    if (!parsedDefinition?.success) return false;
    if (!isEditing) {
      return StrictInlineFieldSchema.safeParse(parsedDefinition.data).success;
    }
    return true;
  }, [parsedDefinition, isEditing]);

  // A definition's name and (YAML) type are its permanent identity: they form the
  // storage key for case values and the Cases analytics field. Editing them is
  // rejected by the server (409 field_identity_immutable), so prevent it inline.
  const originalIdentity = useMemo(() => {
    if (!fieldDefinition) return undefined;
    try {
      const parsed = InlineFieldSchema.safeParse(parseYaml(fieldDefinition.definition));
      return {
        name: fieldDefinition.name,
        type: parsed.success ? parsed.data.type : undefined,
      };
    } catch {
      return { name: fieldDefinition.name, type: undefined };
    }
  }, [fieldDefinition]);

  const identityChanged =
    isEditing &&
    parsedDefinition?.success === true &&
    originalIdentity !== undefined &&
    (parsedDefinition.data.name !== originalIdentity.name ||
      (originalIdentity.type !== undefined &&
        parsedDefinition.data.type !== originalIdentity.type));

  // Automated case creation (the cases connector) can only fill fields that have a default,
  // so a required field without one is a promise no automated writer can keep — the case is
  // created with the field empty. Non-blocking: humans creating cases in the UI still get
  // prompted for it, so this configuration is legal, just worth a deliberate choice.
  const requiredWithoutDefault =
    parsedDefinition?.success === true &&
    !isDisplayOnlyField(parsedDefinition.data) &&
    parsedDefinition.data.validation?.required === true &&
    (() => {
      const defaultValue = (parsedDefinition.data.metadata as { default?: unknown } | undefined)
        ?.default;
      return defaultValue === undefined || defaultValue === null || defaultValue === '';
    })();

  const handleSave = useCallback(() => {
    if (!parsedDefinition?.success || identityChanged) return;

    onSave({
      name: parsedDefinition.data.name,
      description: description.trim(),
      definition,
      isGlobal,
    });
  }, [parsedDefinition, identityChanged, onSave, description, definition, isGlobal]);

  const handleDefaultChange = useCallback((fieldName: string, value: string, control: string) => {
    const trimmedValue = value.trim();
    const isEmptyNumeric = control === FieldType.INPUT_NUMBER && trimmedValue === '';
    const isEmptyUserPicker = control === FieldType.USER_PICKER && (value === '' || value === '[]');

    let newDefinition: string;
    if (isEmptyNumeric || isEmptyUserPicker) {
      newDefinition = removeFieldDefinitionDefault(definitionRef.current);
    } else {
      let parsedValue: FieldDefaultValue;
      if (control === FieldType.INPUT_NUMBER) {
        parsedValue = Number(trimmedValue);
      } else if (control === FieldType.TOGGLE) {
        parsedValue = value === 'true';
      } else if (control === FieldType.CHECKBOX_GROUP) {
        try {
          parsedValue = JSON.parse(value) as string[];
        } catch {
          parsedValue = [];
        }
      } else if (control === FieldType.USER_PICKER) {
        try {
          const result = UserPickerDefaultSchema.safeParse(JSON.parse(value));
          parsedValue = result.success ? result.data : [];
        } catch {
          parsedValue = [];
        }
      } else {
        parsedValue = trimmedValue;
      }
      newDefinition = updateFieldDefinitionDefault(definitionRef.current, parsedValue);
    }

    if (newDefinition !== definitionRef.current) {
      setDefinition(newDefinition);
    }
  }, []);

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      data-test-subj="fieldDefinitionFlyout"
      aria-labelledby={flyoutTitleId}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={flyoutTitleId}>
            {isEditing
              ? i18n.FIELD_DEFINITION_FORM_TITLE_EDIT
              : i18n.FIELD_DEFINITION_FORM_TITLE_CREATE}
          </h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p>{i18n.FIELD_DEFINITION_FORM_DESCRIPTION}</p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm component="form" data-test-subj="fieldDefinitionForm">
          {isEditing && originalIdentity && (
            <>
              <EuiPanel
                hasBorder
                paddingSize="m"
                color="subdued"
                data-test-subj="fieldDefinitionIdentityPanel"
              >
                <EuiDescriptionList
                  type="column"
                  compressed
                  listItems={[
                    {
                      title: i18n.FIELD_IDENTITY_NAME_LABEL,
                      description: (
                        <EuiCode data-test-subj="fieldDefinitionIdentityName">
                          {originalIdentity.name}
                        </EuiCode>
                      ),
                    },
                    ...(originalIdentity.type !== undefined
                      ? [
                          {
                            title: i18n.FIELD_IDENTITY_TYPE_LABEL,
                            description: (
                              <EuiBadge color="hollow" data-test-subj="fieldDefinitionIdentityType">
                                {originalIdentity.type}
                              </EuiBadge>
                            ),
                          },
                        ]
                      : []),
                  ]}
                />
                <EuiSpacer size="s" />
                <EuiText size="xs" color="subdued">
                  <p>{i18n.FIELD_IDENTITY_HELP_TEXT}</p>
                </EuiText>
              </EuiPanel>
              <EuiSpacer size="l" />
            </>
          )}
          <EuiFormRow label={i18n.FIELD_DEFINITION_DESCRIPTION_LABEL} fullWidth>
            <EuiTextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              fullWidth
              data-test-subj="fieldDefinitionDescriptionInput"
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiToolTip content={i18n.APPLY_TO_ALL_CASES_HELP_TEXT}>
            <EuiCheckbox
              id="fieldDefinitionApplyToAllCases"
              label={i18n.APPLY_TO_ALL_CASES_LABEL}
              checked={isGlobal}
              onChange={(e) => setApplyToAllCases(e.target.checked)}
              data-test-subj="fieldDefinitionApplyToAllCasesCheckbox"
            />
          </EuiToolTip>
          <EuiSpacer size="l" />
          <EuiFormRow
            label={i18n.FIELD_DEFINITION_YAML_LABEL}
            helpText={
              isEditing
                ? i18n.FIELD_DEFINITION_YAML_HELP_TEXT
                : i18n.FIELD_DEFINITION_YAML_HELP_TEXT_CREATE
            }
            isInvalid={identityChanged}
            error={
              identityChanged && originalIdentity
                ? [
                    originalIdentity.type !== undefined
                      ? i18n.FIELD_IDENTITY_CHANGED_ERROR(
                          originalIdentity.name,
                          originalIdentity.type
                        )
                      : i18n.FIELD_IDENTITY_NAME_CHANGED_ERROR(originalIdentity.name),
                  ]
                : undefined
            }
            fullWidth
          >
            <FieldDefinitionYamlEditor
              value={definition}
              onChange={setDefinition}
              isEditing={isEditing}
              data-test-subj="fieldDefinitionYamlInput"
            />
          </EuiFormRow>
          {!isEditing && parsedDefinition?.success === true && (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut
                announceOnMount
                size="s"
                color="primary"
                iconType="info"
                title={i18n.FIELD_IDENTITY_CREATE_NOTICE_TITLE}
                data-test-subj="fieldDefinitionIdentityNotice"
              >
                <p>
                  {i18n.FIELD_IDENTITY_CREATE_NOTICE(
                    parsedDefinition.data.name,
                    parsedDefinition.data.type
                  )}
                </p>
              </EuiCallOut>
            </>
          )}
          {requiredWithoutDefault && (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut
                announceOnMount
                size="s"
                color="warning"
                iconType="warning"
                title={i18n.REQUIRED_NO_DEFAULT_WARNING_TITLE}
                data-test-subj="fieldDefinitionRequiredNoDefaultWarning"
              >
                <p>
                  {isGlobal
                    ? i18n.REQUIRED_NO_DEFAULT_WARNING_GLOBAL
                    : i18n.REQUIRED_NO_DEFAULT_WARNING}
                </p>
              </EuiCallOut>
            </>
          )}
          <EuiSpacer size="l" />
          <EuiPanel hasBorder paddingSize="m" color="subdued">
            <EuiTitle size="xs">
              <h3>{i18n.FIELD_DEFINITION_PREVIEW_LABEL}</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <FieldDefinitionPreview definition={definition} onDefaultChange={handleDefaultChange} />
          </EuiPanel>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="fieldDefinitionCancelButton">
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={handleSave}
              isLoading={isSaving}
              disabled={!isDefinitionValid || identityChanged}
              data-test-subj="fieldDefinitionSaveButton"
            >
              {i18n.SAVE_FIELD_DEFINITION}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

FieldDefinitionFlyout.displayName = 'FieldDefinitionFlyout';
