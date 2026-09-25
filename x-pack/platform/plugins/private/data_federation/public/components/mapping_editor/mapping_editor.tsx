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
import { FieldMappingForm } from './field_mapping_form';
import type { FieldMappingFormValue } from './field_mapping_form';
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
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [creatingFieldIds, setCreatingFieldIds] = useState<readonly string[]>([]);
  const validation = useMemo(
    () => validateMappingEditorValue(value, { reservedFieldNames }),
    [reservedFieldNames, value]
  );
  const [validatedFieldIds, setValidatedFieldIds] = useState<readonly string[]>([]);
  const [fieldErrorsById, setFieldErrorsById] = useState<Record<string, FieldValidationErrors>>({});
  const [draftErrors, setDraftErrors] = useState<FieldValidationErrors>({});
  const [draftFormKey, setDraftFormKey] = useState(0);
  const emptyDraftInitialValue = useMemo(
    () => ({ type: 'keyword', name: '', path: '', format: '' }),
    []
  );

  const hasValidatedFieldErrors = useMemo(() => {
    return validatedFieldIds.some((id) => fieldErrorsById[id] !== undefined);
  }, [fieldErrorsById, validatedFieldIds]);

  // Only show the top-level validation callout after the user has attempted
  // to submit (Add/Update) an invalid field. Creating/editing a field should
  // not immediately show "Fix mapping errors".
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
      setFieldErrorsById((prev) => {
        const { [id]: _removed, ...rest } = prev;
        return rest;
      });
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

  const startEditingField = useCallback((id: string) => {
    setEditingFieldId(id);
  }, []);

  const cancelEditingField = useCallback((id: string) => {
    setFieldErrorsById((prev) => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
    setEditingFieldId(null);
  }, []);

  const validateFieldCandidate = useCallback(
    (id: string, candidate: MappingEditorField): FieldValidationErrors | undefined => {
      const nextValue: MappingEditorValue = {
        ...value,
        fields: value.fields.map((f) => (f.id === id ? candidate : f)),
      };
      const nextValidation = validateMappingEditorValue(nextValue, { reservedFieldNames });
      return nextValidation.fieldErrorsById[id];
    },
    [reservedFieldNames, value]
  );

  const addDraftField = useCallback(
    (nextDraft: FieldMappingFormValue) => {
      const tmpId = '__draft__';
      const candidate: MappingEditorField = {
        id: tmpId,
        name: nextDraft.name,
        path: nextDraft.path,
        type: nextDraft.type as any,
        format: nextDraft.format,
      };

      const nextValue: MappingEditorValue = {
        ...value,
        fields: [...value.fields, candidate],
      };
      const nextValidation = validateMappingEditorValue(nextValue, { reservedFieldNames });
      const errors = nextValidation.fieldErrorsById[tmpId];
      if (errors) {
        setDraftErrors(errors);
        return;
      }

      const id = `mapping-field-${nextId.current++}`;
      onChange((prev) => ({
        ...prev,
        fields: [
          ...prev.fields,
          {
            ...candidate,
            id,
            name: candidate.name.trim(),
            path: candidate.path.trim(),
            format: candidate.format.trim(),
          },
        ],
      }));

      setDraftErrors({});
      setDraftFormKey((k) => k + 1);
    },
    [onChange, reservedFieldNames, value]
  );

  return (
    <div data-test-subj="dataFederationMappingEditor">
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
            key={draftFormKey}
            value={emptyDraftInitialValue}
            typeInfoByValue={typeInfoByValue as any}
            errors={draftErrors}
            onDraftChange={() => {
              if (Object.keys(draftErrors).length === 0) return;
              setDraftErrors({});
            }}
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
              const rowErrors = validatedFieldIds.includes(f.id)
                ? fieldErrorsById[f.id]
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
                          typeInfoByValue={typeInfoByValue as any}
                          errors={rowErrors}
                          mode={isCreating ? 'create' : 'edit'}
                          onCancel={
                            isCreating ? () => removeField(f.id) : () => cancelEditingField(f.id)
                          }
                          onDraftChange={(draftValue) => {
                            if (!validatedFieldIds.includes(f.id)) return;
                            const candidate = { ...f, ...draftValue } as MappingEditorField;
                            const errors = validateFieldCandidate(f.id, candidate);
                            setFieldErrorsById((prev) => {
                              if (!errors) return prev;
                              return { ...prev, [f.id]: errors };
                            });
                          }}
                          onSubmit={(draftValue) => {
                            setValidatedFieldIds((prev) =>
                              prev.includes(f.id) ? prev : [...prev, f.id]
                            );
                            const candidate = { ...f, ...draftValue } as MappingEditorField;
                            const errors = validateFieldCandidate(f.id, candidate);
                            if (errors) {
                              setFieldErrorsById((prev) => ({ ...prev, [f.id]: errors }));
                              return;
                            }

                            replaceField(f.id, {
                              ...candidate,
                              name: candidate.name.trim(),
                              path: candidate.path.trim(),
                              format: candidate.format.trim(),
                            });
                            setEditingFieldId(null);
                            setCreatingFieldIds((prev) => prev.filter((v) => v !== f.id));
                            setFieldErrorsById((prev) => {
                              const { [f.id]: _removed, ...rest } = prev;
                              return rest;
                            });
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
