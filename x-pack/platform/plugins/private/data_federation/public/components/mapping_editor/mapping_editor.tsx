/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { FC, SetStateAction } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
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
  const typeInfoByValue = useMemo(() => getTypeInfoByValue(docLinks), [docLinks]);
  const nextId = useRef(0);
  const originalFieldById = useRef<Record<string, MappingEditorField>>({});
  const validation = useMemo(
    () => validateMappingEditorValue(value, { reservedFieldNames }),
    [reservedFieldNames, value]
  );
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [creatingFieldIds, setCreatingFieldIds] = useState<readonly string[]>([]);
  const [draftField, setDraftField] = useState<MappingEditorField>(() => ({
    id: 'draft',
    name: '',
    path: '',
    type: 'keyword',
    format: '',
  }));
  const [validatedFieldIds, setValidatedFieldIds] = useState<readonly string[]>([]);
  const [draftValidationAttempted, setDraftValidationAttempted] = useState(false);

  const markFieldValidated = useCallback((id: string) => {
    setValidatedFieldIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const hasValidatedFieldErrors = useMemo(() => {
    return validatedFieldIds.some((id) => validation.fieldErrorsById[id] !== undefined);
  }, [validatedFieldIds, validation.fieldErrorsById]);

  const shouldShowValidationCallout = hasValidatedFieldErrors;

  const addField = useCallback(() => {
    const id = `mapping-field-${nextId.current++}`;
    onChange((prev) => ({
      ...prev,
      fields: [
        ...prev.fields,
        {
          id,
          name: '',
          path: '',
          type: 'keyword',
          format: '',
        },
      ],
    }));
    setEditingFieldId(id);
    setCreatingFieldIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, [onChange]);

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

  const draftFieldErrors = useMemo(() => {
    if (!draftValidationAttempted) return {};

    const errors: { name?: string; type?: string; format?: string } = {};
    const name = draftField.name.trim();
    const type = draftField.type;

    if (!name) {
      errors.name = i18n.translate('xpack.dataFederation.mappingEditor.validation.nameRequired', {
        defaultMessage: 'Logical name is required.',
      });
    } else if (reservedFieldNames?.some((n) => n.trim() === name)) {
      errors.name = i18n.translate('xpack.dataFederation.mappingEditor.validation.nameReserved', {
        defaultMessage: 'This field name is reserved.',
      });
    } else {
      const isDuplicate = value.fields.some((f) => f.name.trim() === name);
      if (isDuplicate) {
        errors.name = i18n.translate(
          'xpack.dataFederation.mappingEditor.validation.nameDuplicate',
          {
            defaultMessage: 'Names must be unique.',
          }
        );
      }
    }

    if (!type) {
      errors.type = i18n.translate('xpack.dataFederation.mappingEditor.validation.typeRequired', {
        defaultMessage: 'Type is required.',
      });
    }

    const format = draftField.format.trim();
    if (format && type !== 'date') {
      errors.format = i18n.translate(
        'xpack.dataFederation.mappingEditor.validation.formatDateOnly',
        {
          defaultMessage: 'Format is only valid for type date.',
        }
      );
    }

    return errors;
  }, [draftField, draftValidationAttempted, reservedFieldNames, value.fields]);

  const addDraftField = useCallback(() => {
    setDraftValidationAttempted(true);

    const name = draftField.name.trim();
    const type = draftField.type;
    const format = draftField.format.trim();
    const isDuplicate = Boolean(name) && value.fields.some((f) => f.name.trim() === name);
    const isReserved = Boolean(name) && (reservedFieldNames ?? []).some((n) => n.trim() === name);
    const hasErrors =
      !name || !type || isDuplicate || isReserved || (Boolean(format) && type !== 'date');
    if (hasErrors) return;

    const id = `mapping-field-${nextId.current++}`;
    onChange((prev) => ({
      ...prev,
      fields: [
        ...prev.fields,
        {
          ...draftField,
          id,
          name,
          path: draftField.path.trim(),
          format: draftField.format.trim(),
        },
      ],
    }));

    // Reset draft for subsequent additions (only visible in empty state).
    setDraftField({
      id: 'draft',
      name: '',
      path: '',
      type: 'keyword',
      format: '',
    });
    setDraftValidationAttempted(false);
  }, [draftField, onChange, reservedFieldNames, value.fields]);

  return (
    <div data-test-subj="dataFederationMappingEditor" style={{ padding: euiTheme.size.m }}>
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
      {value.fields.length === 0 ? (
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
          />
        </EuiPanel>
      ) : (
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
                    <EuiFlexGroup gutterSize="m" alignItems={isEditing ? 'flexStart' : 'center'}>
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
          {editingFieldId === null ? (
            <EuiFlexGroup justifyContent="flexStart" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  color="primary"
                  fill
                  onClick={addField}
                  data-test-subj="dataFederationMappingEditorAddField"
                >
                  {i18n.translate('xpack.dataFederation.mappingEditor.addFieldButton', {
                    defaultMessage: 'Add field',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : null}
        </>
      )}
    </div>
  );
};
