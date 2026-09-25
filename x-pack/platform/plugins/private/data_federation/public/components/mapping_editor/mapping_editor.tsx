/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { FC, SetStateAction } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';

import type { DatasetMappingFieldType, DatasetMappings } from '../../../common';
import { FieldMappingForm, getFieldTypeDocsHelpText } from './field_mapping_form';
import { FieldMappingDisplayMode } from './field_mapping_display_mode';
import { emptyMappingEditorValue, getTypeInfoByValue } from './constants';
import { validateMappingEditorValue } from './validate_mapping_editor_value';

export { validateMappingEditorValue };
export { emptyMappingEditorValue };

export interface MappingEditorField {
  id: string;
  name: string;
  path: string;
  type: '' | DatasetMappingFieldType;
  format: string;
}

export interface MappingEditorValue {
  dynamic: boolean;
  fields: MappingEditorField[];
}

interface FieldValidationErrors {
  name?: string;
  type?: string;
  format?: string;
}

export interface MappingEditorValidationResult {
  isValid: boolean;
  hasAnyDeclaredMappings: boolean;
  globalErrors: string[];
  fieldErrorsById: Record<string, FieldValidationErrors>;
}

export interface MappingEditorProps {
  value: MappingEditorValue;
  onChange: (next: SetStateAction<MappingEditorValue>) => void;
  docLinks: DocLinksStart;
  reservedFieldNames?: readonly string[];
}

export const buildDatasetMappings = (value: MappingEditorValue): DatasetMappings | undefined => {
  const properties = value.fields.reduce<DatasetMappings['properties']>((acc, f) => {
    const name = f.name.trim();
    if (!name || !f.type) return acc;

    const type = f.type;
    const prop: DatasetMappings['properties'][string] = { type };

    const path = f.path.trim();
    if (path) prop.path = path;

    const format = f.format.trim();
    if ((type === 'date' || type === 'date_nanos') && format) prop.format = format;

    acc[name] = prop;
    return acc;
  }, {});

  const dynamic = value.dynamic;

  const hasAny = Object.keys(properties).length > 0;

  if (!hasAny) return undefined;

  return {
    ...(!dynamic ? { dynamic: 'false' as const } : {}),
    properties,
  };
};

export const MappingEditor: FC<MappingEditorProps> = ({
  value,
  onChange,
  docLinks,
  reservedFieldNames,
}) => {
  const { euiTheme } = useEuiTheme();
  const isDefineSchemaSelected = !value.dynamic;
  const isInferSchemaSelected = value.dynamic;
  const typeInfoByValue = useMemo(() => getTypeInfoByValue(docLinks), [docLinks]);
  const nextId = useRef(0);
  const originalFieldById = useRef<Record<string, MappingEditorField>>({});
  const validation = useMemo(
    () => validateMappingEditorValue(value, { reservedFieldNames }),
    [reservedFieldNames, value]
  );
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [creatingFieldIds, setCreatingFieldIds] = useState<readonly string[]>([]);
  const [validatedFieldIds, setValidatedFieldIds] = useState<readonly string[]>([]);
  const [isAddFieldFormOpen, setIsAddFieldFormOpen] = useState(false);
  const [draftField, setDraftField] = useState<MappingEditorField>(() => ({
    id: 'draft',
    name: '',
    path: '',
    type: 'keyword',
    format: '',
  }));
  const [draftValidationAttempted, setDraftValidationAttempted] = useState(false);

  const markFieldValidated = useCallback((id: string) => {
    setValidatedFieldIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const hasValidatedFieldErrors = useMemo(() => {
    return validatedFieldIds.some((id) => validation.fieldErrorsById[id] !== undefined);
  }, [validatedFieldIds, validation.fieldErrorsById]);

  const shouldShowValidationCallout = hasValidatedFieldErrors;

  const openAddFieldForm = useCallback(() => {
    setIsAddFieldFormOpen(true);
  }, []);

  const closeAddFieldForm = useCallback(() => {
    setIsAddFieldFormOpen(false);
    setDraftField({
      id: 'draft',
      name: '',
      path: '',
      type: 'keyword',
      format: '',
    });
    setDraftValidationAttempted(false);
  }, []);

  const draftFieldErrors = useMemo(() => {
    if (!draftValidationAttempted) return {};
    const validationWithDraft = validateMappingEditorValue(
      {
        ...value,
        fields: [...value.fields, draftField],
      },
      { reservedFieldNames }
    );
    return validationWithDraft.fieldErrorsById[draftField.id] ?? {};
  }, [draftField, draftValidationAttempted, reservedFieldNames, value]);

  const addDraftField = useCallback(() => {
    setDraftValidationAttempted(true);
    const validationWithDraft = validateMappingEditorValue(
      {
        ...value,
        fields: [...value.fields, draftField],
      },
      { reservedFieldNames }
    );
    const draftErrors = validationWithDraft.fieldErrorsById[draftField.id];
    if (draftErrors) return;

    const id = `mapping-field-${nextId.current++}`;
    onChange((prev) => ({
      ...prev,
      fields: [
        ...prev.fields,
        {
          ...draftField,
          id,
          name: draftField.name.trim(),
          path: draftField.path.trim(),
          format: draftField.format.trim(),
        },
      ],
    }));

    // Keep the form open so additional fields can be added.
    setDraftField({
      id: 'draft',
      name: '',
      path: '',
      type: 'keyword',
      format: '',
    });
    setDraftValidationAttempted(false);
  }, [draftField, onChange, reservedFieldNames, value]);

  const removeField = useCallback(
    (id: string) => {
      onChange((prev) => ({
        ...prev,
        fields: prev.fields.filter((f) => f.id !== id),
      }));
      setEditingFieldId((current) => (current === id ? null : current));
      setValidatedFieldIds((prev) => prev.filter((v) => v !== id));
      setCreatingFieldIds((prev) => prev.filter((v) => v !== id));
    },
    [onChange]
  );

  const updateField = useCallback(
    (id: string, patch: Partial<MappingEditorField>) => {
      onChange((prev) => ({
        ...prev,
        fields: prev.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
      }));
    },
    [onChange]
  );

  const replaceField = useCallback(
    (id: string, next: MappingEditorField) => {
      onChange((prev) => ({
        ...prev,
        fields: prev.fields.map((f) => (f.id === id ? next : f)),
      }));
    },
    [onChange]
  );

  const startEditingField = useCallback(
    (id: string) => {
      const current = value.fields.find((f) => f.id === id);
      if (current && originalFieldById.current[id] === undefined) {
        originalFieldById.current[id] = current;
      }
      setEditingFieldId(id);
    },
    [value.fields]
  );

  const cancelEditingField = useCallback(
    (id: string) => {
      const original = originalFieldById.current[id];
      if (original) {
        replaceField(id, original);
      }
      delete originalFieldById.current[id];
      setEditingFieldId(null);
    },
    [replaceField]
  );

  return (
    <div data-test-subj="dataFederationMappingEditor">
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h3>
              {isInferSchemaSelected
                ? i18n.translate('xpack.dataFederation.mappingEditor.fieldMappingsTitleOptional', {
                    defaultMessage: 'Field mappings (optional)',
                  })
                : i18n.translate('xpack.dataFederation.mappingEditor.fieldMappingsTitle', {
                    defaultMessage: 'Field mappings',
                  })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        {isDefineSchemaSelected ? (
          <EuiFlexItem grow={false}>
            <EuiBadge color="danger">
              {i18n.translate('xpack.dataFederation.mappingEditor.fieldMappingsRequiredBadge', {
                defaultMessage: 'Required',
              })}
            </EuiBadge>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        {isInferSchemaSelected
          ? i18n.translate('xpack.dataFederation.mappingEditor.fieldMappingsSubheadingInfer', {
              defaultMessage: "Schema will be inferred at query time for fields you don't map.",
            })
          : i18n.translate('xpack.dataFederation.mappingEditor.fieldMappingsSubheading', {
              defaultMessage:
                'Map at least one field, unmapped fields will not be inferred at query time, so nothing will be available to query until you add mappings.',
            })}
      </EuiText>
      <EuiSpacer size="m" />

      {!validation.isValid && shouldShowValidationCallout ? (
        <>
          <KbnDangerCallout
            title={i18n.translate('xpack.dataFederation.mappingEditor.validation.title', {
              defaultMessage: 'Fix mapping errors',
            })}
            text={
              <ul>
                {validation.globalErrors.map((e, idx) => (
                  <li key={idx}>{e}</li>
                ))}
                {hasValidatedFieldErrors ? (
                  <li>
                    {i18n.translate('xpack.dataFederation.mappingEditor.validation.fieldErrors', {
                      defaultMessage: 'One or more fields are incomplete or invalid.',
                    })}
                  </li>
                ) : null}
              </ul>
            }
            data-test-subj="dataFederationMappingEditorValidationError"
          />
          <EuiSpacer size="m" />
        </>
      ) : null}
      <EuiSpacer size="s" />
      {value.fields.length > 0 ? (
        <>
          <EuiFlexGroup direction="column" gutterSize="s">
            {value.fields.map((f) => {
              const typeInfo = (
                typeInfoByValue as Record<string, { label: string; docs: string } | undefined>
              )[f.type];
              const isEditing = editingFieldId === f.id;
              const isCreating = creatingFieldIds.includes(f.id);
              const shouldShowRowValidation = validatedFieldIds.includes(f.id);
              const rowErrors = shouldShowRowValidation
                ? validation.fieldErrorsById[f.id]
                : undefined;
              return (
                <EuiFlexItem key={f.id}>
                  <div
                    style={{
                      backgroundColor: isEditing
                        ? euiTheme.colors.backgroundBaseSubdued
                        : euiTheme.colors.backgroundBasePlain,
                      padding: euiTheme.size.s,
                      borderTop: '0',
                      borderLeft: '0',
                      borderRight: '0',
                      borderBottom: euiTheme.border.thin,
                      borderRadius: 0,
                    }}
                  >
                    <EuiFlexGroup
                      gutterSize="m"
                      alignItems={isEditing ? 'flexStart' : 'center'}
                      responsive={false}
                      wrap
                    >
                      {isEditing ? (
                        <FieldMappingForm
                          value={f}
                          onChange={(patch) => {
                            updateField(f.id, patch as Partial<MappingEditorField>);
                          }}
                          typeHelpText={
                            f.type ? getFieldTypeDocsHelpText(f.type, typeInfoByValue) : undefined
                          }
                          errors={rowErrors}
                          mode={isCreating ? 'create' : 'edit'}
                          onCancel={
                            isCreating ? () => removeField(f.id) : () => cancelEditingField(f.id)
                          }
                          onSubmit={() => {
                            const nextValidation = validateMappingEditorValue(value, {
                              reservedFieldNames,
                            });
                            const fieldErrors = nextValidation.fieldErrorsById[f.id];
                            markFieldValidated(f.id);
                            if (fieldErrors) return;
                            setEditingFieldId(null);
                            setCreatingFieldIds((prev) => prev.filter((v) => v !== f.id));
                            delete originalFieldById.current[f.id];
                          }}
                        />
                      ) : (
                        <FieldMappingDisplayMode
                          field={f}
                          typeLabel={typeInfo?.label}
                          onEdit={() => startEditingField(f.id)}
                          onRemove={() => removeField(f.id)}
                          areActionsDisabled={editingFieldId !== null}
                        />
                      )}
                    </EuiFlexGroup>
                  </div>
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
          <EuiSpacer size="m" />
        </>
      ) : null}
      {editingFieldId === null ? (
        <EuiFlexGroup justifyContent="flexStart" responsive={false}>
          <EuiFlexItem grow={false}>
            {!isAddFieldFormOpen ? (
              <EuiButton
                size="s"
                color="primary"
                fill
                onClick={openAddFieldForm}
                data-test-subj="dataFederationMappingEditorAddField"
              >
                {i18n.translate('xpack.dataFederation.mappingEditor.addFieldButton', {
                  defaultMessage: 'Add field',
                })}
              </EuiButton>
            ) : null}
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}

      {isAddFieldFormOpen && editingFieldId === null ? (
        <>
          <EuiSpacer size="m" />
          <EuiPanel paddingSize="s" color="subdued" hasBorder={false}>
            <FieldMappingForm
              value={draftField}
              onChange={(patch) =>
                setDraftField((prev) => ({ ...prev, ...(patch as Partial<MappingEditorField>) }))
              }
              typeHelpText={
                draftField.type
                  ? getFieldTypeDocsHelpText(
                      draftField.type as DatasetMappingFieldType,
                      typeInfoByValue
                    )
                  : undefined
              }
              errors={draftFieldErrors}
              mode="create"
              onSubmit={addDraftField}
              onCancel={closeAddFieldForm}
            />
          </EuiPanel>
        </>
      ) : null}
    </div>
  );
};
