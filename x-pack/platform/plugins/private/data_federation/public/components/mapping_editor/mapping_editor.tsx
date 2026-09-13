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
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';

import type { DatasetMappingFieldType, DatasetMappings } from '../../../common';
import { FieldMappingForm, getFieldTypeDocsHelpText } from './field_mapping_form';
import { FieldMappingDisplayMode } from './field_mapping_display_mode';
import { MappingJsonPreview } from './mapping_json_preview';

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
  /**
   * When true, shows a JSON preview matching the docs.
   * Defaults to true because the output is typically copy/pasted.
   */
  showJsonPreview?: boolean;
}

const ELASTICSEARCH_MAPPING_REFERENCE_BASE_URL =
  'https://www.elastic.co/docs/reference/elasticsearch/mapping-reference';

const TYPE_INFO_BY_VALUE: Record<DatasetMappingFieldType, { label: string; docs: string }> = {
  boolean: {
    label: 'Boolean',
    docs: `${ELASTICSEARCH_MAPPING_REFERENCE_BASE_URL}/boolean`,
  },
  date: {
    label: 'Date',
    docs: `${ELASTICSEARCH_MAPPING_REFERENCE_BASE_URL}/date`,
  },
  double: {
    label: 'Double',
    docs: `${ELASTICSEARCH_MAPPING_REFERENCE_BASE_URL}/number`,
  },
  integer: {
    label: 'Integer',
    docs: `${ELASTICSEARCH_MAPPING_REFERENCE_BASE_URL}/number`,
  },
  ip: {
    label: 'IP',
    docs: `${ELASTICSEARCH_MAPPING_REFERENCE_BASE_URL}/ip`,
  },
  keyword: {
    label: 'Keyword',
    docs: `${ELASTICSEARCH_MAPPING_REFERENCE_BASE_URL}/keyword`,
  },
  long: {
    label: 'Long',
    docs: `${ELASTICSEARCH_MAPPING_REFERENCE_BASE_URL}/number`,
  },
  unsigned_long: {
    label: 'Unsigned long',
    docs: `${ELASTICSEARCH_MAPPING_REFERENCE_BASE_URL}/unsigned-long`,
  },
};

export const emptyMappingEditorValue = (): MappingEditorValue => ({
  dynamic: true,
  fields: [],
});

const isFieldBlank = (field: MappingEditorField): boolean => {
  return (
    field.name.trim() === '' &&
    field.path.trim() === '' &&
    field.type === '' &&
    field.format.trim() === ''
  );
};

export const validateMappingEditorValue = (
  value: MappingEditorValue
): MappingEditorValidationResult => {
  const fieldErrorsById: Record<string, FieldValidationErrors> = {};
  const globalErrors: string[] = [];

  const nonBlankFields = value.fields.filter((f) => !isFieldBlank(f));

  const trimmedNames = nonBlankFields.map((f) => ({ id: f.id, name: f.name.trim() }));
  const nameCounts = trimmedNames.reduce<Record<string, number>>((acc, { name }) => {
    if (!name) return acc;
    acc[name] = (acc[name] ?? 0) + 1;
    return acc;
  }, {});

  for (const f of nonBlankFields) {
    const errors: FieldValidationErrors = {};

    const name = f.name.trim();
    if (!name) {
      errors.name = i18n.translate('xpack.dataFederation.mappingEditor.validation.nameRequired', {
        defaultMessage: 'Name is required.',
      });
    } else if ((nameCounts[name] ?? 0) > 1) {
      errors.name = i18n.translate('xpack.dataFederation.mappingEditor.validation.nameDuplicate', {
        defaultMessage: 'Names must be unique.',
      });
    }

    if (!f.type) {
      errors.type = i18n.translate('xpack.dataFederation.mappingEditor.validation.typeRequired', {
        defaultMessage: 'Type is required.',
      });
    }

    const format = f.format.trim();
    if (format && f.type !== 'date') {
      errors.format = i18n.translate(
        'xpack.dataFederation.mappingEditor.validation.formatDateOnly',
        {
          defaultMessage: 'Format is only valid for type date.',
        }
      );
    }

    if (Object.keys(errors).length > 0) {
      fieldErrorsById[f.id] = errors;
    }
  }

  // Treat "mappings present" as having at least one fully-declared field (name + type)
  const declaredFieldCount = nonBlankFields.filter((f) => f.name.trim() && f.type).length;
  const hasAnyDeclaredMappings = declaredFieldCount > 0;

  const isValid = globalErrors.length === 0 && Object.keys(fieldErrorsById).length === 0;

  return {
    isValid,
    hasAnyDeclaredMappings,
    globalErrors,
    fieldErrorsById,
  };
};

export const buildDatasetMappings = (value: MappingEditorValue): DatasetMappings | undefined => {
  const properties = value.fields.reduce<DatasetMappings['properties']>((acc, f) => {
    const name = f.name.trim();
    if (!name || !f.type) return acc;

    const type = f.type;
    const prop: DatasetMappings['properties'][string] = { type };

    const path = f.path.trim();
    if (path) prop.path = path;

    const format = f.format.trim();
    if (type === 'date' && format) prop.format = format;

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
  showJsonPreview = true,
}) => {
  const nextId = useRef(0);
  const validation = useMemo(() => validateMappingEditorValue(value), [value]);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [fieldSearch, setFieldSearch] = useState('');
  const [draftField, setDraftField] = useState<MappingEditorField>(() => ({
    id: 'draft',
    name: '',
    path: '',
    type: '',
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
          type: '',
          format: '',
        },
      ],
    }));
    setEditingFieldId(id);
  }, [onChange]);

  const removeField = useCallback(
    (id: string) => {
      onChange((prev) => ({
        ...prev,
        fields: prev.fields.filter((f) => f.id !== id),
      }));
      setEditingFieldId((current) => (current === id ? null : current));
      setValidatedFieldIds((prev) => prev.filter((v) => v !== id));
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

  const mappings = useMemo(() => buildDatasetMappings(value), [value]);
  const previewJson = useMemo(() => {
    if (!mappings) return '';
    return JSON.stringify({ mappings }, null, 2);
  }, [mappings]);

  const filteredFields = useMemo(() => {
    const q = fieldSearch.trim().toLowerCase();
    if (!q) return value.fields;

    return value.fields.filter((f) => {
      const name = f.name.trim().toLowerCase();
      const renameTo = f.path.trim().toLowerCase();
      return name.includes(q) || renameTo.includes(q);
    });
  }, [fieldSearch, value.fields]);

  const draftFieldErrors = useMemo(() => {
    if (!draftValidationAttempted) return {};

    const errors: { name?: string; type?: string; format?: string } = {};
    const name = draftField.name.trim();
    const type = draftField.type;

    if (!name) {
      errors.name = i18n.translate('xpack.dataFederation.mappingEditor.validation.nameRequired', {
        defaultMessage: 'Logical name is required.',
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
  }, [draftField, draftValidationAttempted, value.fields]);

  const addDraftField = useCallback(() => {
    setDraftValidationAttempted(true);

    const name = draftField.name.trim();
    const type = draftField.type;
    const format = draftField.format.trim();
    const isDuplicate = Boolean(name) && value.fields.some((f) => f.name.trim() === name);
    const hasErrors = !name || !type || isDuplicate || (Boolean(format) && type !== 'date');
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
      type: '',
      format: '',
    });
    setDraftValidationAttempted(false);
  }, [draftField, onChange, value.fields]);

  return (
    <EuiPanel paddingSize="m" hasBorder data-test-subj="dataFederationMappingEditor">
      <EuiTitle size="s">
        <h3>
          {i18n.translate('xpack.dataFederation.mappingEditor.title', {
            defaultMessage: 'Dataset mappings',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.dataFederation.mappingEditor.description', {
            defaultMessage:
              'Declare a schema, rename physical columns using “path”, and optionally add a date “format”.',
          })}
        </p>
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
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem>
          <EuiFormRow
            helpText={i18n.translate('xpack.dataFederation.mappingEditor.dynamicDescription', {
              defaultMessage: 'Dynamic fields will be inferred at query time if not mapped.',
            })}
            fullWidth
          >
            <EuiSwitch
              name="dataFederationMappingEditorDynamic"
              label={
                <>
                  {i18n.translate('xpack.dataFederation.mappingEditor.dynamicLabel', {
                    defaultMessage: 'Dynamic fields',
                  })}{' '}
                  <EuiIconTip
                    content={i18n.translate('xpack.dataFederation.mappingEditor.dynamicHelp', {
                      defaultMessage:
                        'When enabled, undeclared columns are included (schema inference overlays your declared fields). Disable to treat your declaration as the complete schema.',
                    })}
                    position="right"
                  />
                </>
              }
              checked={value.dynamic}
              onChange={(e) => onChange((prev) => ({ ...prev, dynamic: e.target.checked }))}
              data-test-subj="dataFederationMappingEditorDynamic"
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h4>
              {i18n.translate('xpack.dataFederation.mappingEditor.fieldsTitle', {
                defaultMessage: 'Mapped fields',
              })}
            </h4>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.dataFederation.mappingEditor.timestampRecommendation', {
              defaultMessage:
                'Mapping your timestamp field and renaming it to @timestamp is recommended.',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false} style={{ alignSelf: 'flex-end' }}>
              {(() => {
                const isVisible = editingFieldId === null && value.fields.length > 0;
                return (
                  <div
                    style={{
                      width: 'fit-content',
                      visibility: isVisible ? 'visible' : 'hidden',
                    }}
                    aria-hidden={!isVisible}
                  >
                    <EuiButton
                      iconType="plusCircle"
                      size="s"
                      color="primary"
                      onClick={addField}
                      data-test-subj="dataFederationMappingEditorAddField"
                    >
                      {i18n.translate('xpack.dataFederation.mappingEditor.addFieldButton', {
                        defaultMessage: 'Add field',
                      })}
                    </EuiButton>
                  </div>
                );
              })()}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <div style={{ width: 320 }}>
                <EuiFieldSearch
                  placeholder={i18n.translate('xpack.dataFederation.mappingEditor.searchFields', {
                    defaultMessage: 'Search fields',
                  })}
                  aria-label={i18n.translate('xpack.dataFederation.mappingEditor.searchFields', {
                    defaultMessage: 'Search fields',
                  })}
                  value={fieldSearch}
                  onChange={(event) => setFieldSearch(event.target.value)}
                  fullWidth
                  data-test-subj="dataFederationMappingEditorSearchFields"
                />
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
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
                    TYPE_INFO_BY_VALUE
                  )
                : undefined
            }
            errors={draftFieldErrors}
            mode="create"
            onSubmit={addDraftField}
          />
        </EuiPanel>
      ) : filteredFields.length === 0 ? (
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.dataFederation.mappingEditor.noSearchResults', {
              defaultMessage: 'No fields match your search.',
            })}
          </p>
        </EuiText>
      ) : (
        <EuiFlexGroup direction="column" gutterSize="s">
          {filteredFields.map((f) => {
            const typeInfo = (
              TYPE_INFO_BY_VALUE as Record<string, { label: string; docs: string } | undefined>
            )[f.type];
            const isEditing = editingFieldId === f.id;
            const shouldShowRowValidation = validatedFieldIds.includes(f.id);
            const rowErrors = shouldShowRowValidation
              ? validation.fieldErrorsById[f.id]
              : undefined;
            return (
              <EuiFlexItem key={f.id}>
                <EuiPanel paddingSize="s" color="subdued" hasBorder={false}>
                  <EuiFlexGroup gutterSize="m" alignItems="flexStart">
                    {isEditing ? (
                      <>
                        <FieldMappingForm
                          value={f}
                          onChange={(patch) => {
                            updateField(f.id, patch as Partial<MappingEditorField>);
                          }}
                          typeHelpText={
                            f.type
                              ? getFieldTypeDocsHelpText(f.type, TYPE_INFO_BY_VALUE)
                              : undefined
                          }
                          pathHelpText={i18n.translate(
                            'xpack.dataFederation.mappingEditor.physicalPathHelp',
                            {
                              defaultMessage: 'Physical column name, if differs from name.',
                            }
                          )}
                          errors={rowErrors}
                          mode="edit"
                          onSubmit={() => {
                            const nextValidation = validateMappingEditorValue(value);
                            const fieldErrors = nextValidation.fieldErrorsById[f.id];
                            markFieldValidated(f.id);
                            if (fieldErrors) return;
                            setEditingFieldId(null);
                          }}
                        />
                      </>
                    ) : (
                      <FieldMappingDisplayMode
                        field={f}
                        fieldSearch={fieldSearch}
                        typeLabel={typeInfo?.label}
                        onEdit={() => setEditingFieldId(f.id)}
                        onRemove={() => removeField(f.id)}
                      />
                    )}
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      )}
      // todo remove
      {showJsonPreview ? <MappingJsonPreview json={previewJson} /> : null}
    </EuiPanel>
  );
};
