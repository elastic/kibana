/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef } from 'react';
import type { ChangeEvent, FC } from 'react';
import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';

import type { DatasetMappings } from '../../../common';

export enum DataType {
  KEYWORD = 'keyword',
  TEXT = 'text',
  LONG = 'long',
  INTEGER = 'integer',
  DOUBLE = 'double',
  BOOLEAN = 'boolean',
  DATETIME = 'datetime',
  UNSIGNED_LONG = 'unsigned_long',
  IP = 'ip',
}

type EditorDynamicValue = '' | 'true' | 'false';

export interface MappingEditorField {
  id: string;
  name: string;
  path: string;
  type: '' | DataType;
  format: string;
}

export interface MappingEditorValue {
  dynamic: EditorDynamicValue;
  idPath: string;
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
  idPathError?: string;
  fieldErrorsById: Record<string, FieldValidationErrors>;
}

export interface MappingEditorProps {
  value: MappingEditorValue;
  onChange: (next: MappingEditorValue) => void;
  /**
   * When true, shows a JSON preview matching the docs.
   * Defaults to true because the output is typically copy/pasted.
   */
  showJsonPreview?: boolean;
}

const typeToDatasetMappingType = (
  type: DataType
): DatasetMappings['properties'][string]['type'] => {
  if (type === DataType.DATETIME) return 'date';
  return type;
};

const TYPE_OPTIONS = [
  {
    value: '',
    text: i18n.translate('xpack.dataFederation.mappingEditor.typePlaceholder', {
      defaultMessage: 'Select type',
    }),
  },
  { value: DataType.KEYWORD, text: 'keyword' },
  { value: DataType.TEXT, text: 'text' },
  { value: DataType.LONG, text: 'long' },
  { value: DataType.INTEGER, text: 'integer' },
  { value: DataType.DOUBLE, text: 'double' },
  { value: DataType.BOOLEAN, text: 'boolean' },
  { value: DataType.DATETIME, text: 'date' },
  { value: DataType.UNSIGNED_LONG, text: 'unsigned_long' },
  { value: DataType.IP, text: 'ip' },
] as const;

const DYNAMIC_OPTIONS = [
  {
    value: '',
    text: i18n.translate('xpack.dataFederation.mappingEditor.dynamicPlaceholder', {
      defaultMessage: 'Use default (true)',
    }),
  },
  { value: 'true', text: 'true' },
  { value: 'false', text: 'false' },
] as const;

export const emptyMappingEditorValue = (): MappingEditorValue => ({
  dynamic: '',
  idPath: '',
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
        defaultMessage: 'Logical name is required.',
      });
    } else if ((nameCounts[name] ?? 0) > 1) {
      errors.name = i18n.translate('xpack.dataFederation.mappingEditor.validation.nameDuplicate', {
        defaultMessage: 'Logical names must be unique.',
      });
    }

    if (!f.type) {
      errors.type = i18n.translate('xpack.dataFederation.mappingEditor.validation.typeRequired', {
        defaultMessage: 'Type is required.',
      });
    }

    const format = f.format.trim();
    if (format && f.type !== DataType.DATETIME) {
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

  if (
    (value.dynamic === 'true' || value.dynamic === 'false' || value.idPath.trim() !== '') &&
    !hasAnyDeclaredMappings
  ) {
    globalErrors.push(
      i18n.translate('xpack.dataFederation.mappingEditor.validation.propertiesRequired', {
        defaultMessage: 'Add at least one field mapping.',
      })
    );
  }

  const idPath = value.idPath.trim();
  let idPathError: string | undefined;
  if (idPath) {
    const candidatePaths = nonBlankFields
      .flatMap((f) => {
        const logical = f.name.trim();
        const physical = f.path.trim();
        return [logical, physical].filter((v): v is string => Boolean(v));
      })
      .filter((v, idx, arr) => arr.indexOf(v) === idx);

    if (!candidatePaths.includes(idPath)) {
      idPathError = i18n.translate('xpack.dataFederation.mappingEditor.validation.idPathUnknown', {
        defaultMessage: '_id.path must match a declared logical name or a declared path.',
      });
    }
  }

  const isValid =
    globalErrors.length === 0 && !idPathError && Object.keys(fieldErrorsById).length === 0;

  return {
    isValid,
    hasAnyDeclaredMappings,
    globalErrors,
    idPathError,
    fieldErrorsById,
  };
};

export const buildDatasetMappings = (value: MappingEditorValue): DatasetMappings | undefined => {
  const properties = value.fields.reduce<DatasetMappings['properties']>((acc, f) => {
    const name = f.name.trim();
    if (!name || !f.type) return acc;

    const type = typeToDatasetMappingType(f.type);
    const prop: DatasetMappings['properties'][string] = { type };

    const path = f.path.trim();
    if (path) prop.path = path;

    const format = f.format.trim();
    if (type === 'date' && format) prop.format = format;

    acc[name] = prop;
    return acc;
  }, {});

  const dynamic = value.dynamic;
  const idPath = value.idPath.trim();

  const hasAny = Object.keys(properties).length > 0;

  if (!hasAny) return undefined;

  return {
    ...(dynamic ? { dynamic } : {}),
    properties,
    ...(idPath ? { _id: { path: idPath } } : {}),
  };
};

export const MappingEditor: FC<MappingEditorProps> = ({
  value,
  onChange,
  showJsonPreview = true,
}) => {
  const nextId = useRef(0);
  const validation = useMemo(() => validateMappingEditorValue(value), [value]);

  const addField = useCallback(() => {
    const id = `mapping-field-${nextId.current++}`;
    onChange({
      ...value,
      fields: [
        ...value.fields,
        {
          id,
          name: '',
          path: '',
          type: '',
          format: '',
        },
      ],
    });
  }, [onChange, value]);

  const removeField = useCallback(
    (id: string) => {
      onChange({
        ...value,
        fields: value.fields.filter((f) => f.id !== id),
      });
    },
    [onChange, value]
  );

  const updateField = useCallback(
    (id: string, patch: Partial<MappingEditorField>) => {
      onChange({
        ...value,
        fields: value.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
      });
    },
    [onChange, value]
  );

  const onDynamicChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...value, dynamic: e.target.value as EditorDynamicValue });
  };

  const idPathOptions = useMemo(() => {
    const candidates = value.fields
      .map((f) => f.path.trim() || f.name.trim())
      .filter((p): p is string => Boolean(p));

    const unique = Array.from(new Set(candidates)).sort((a, b) => a.localeCompare(b));

    return [
      {
        value: '',
        text: i18n.translate('xpack.dataFederation.mappingEditor.idPathPlaceholder', {
          defaultMessage: 'Do not set _id',
        }),
      },
      ...unique.map((p) => ({ value: p, text: p })),
    ];
  }, [value.fields]);

  const mappings = useMemo(() => buildDatasetMappings(value), [value]);
  const previewJson = useMemo(() => {
    if (!mappings) return '';
    return JSON.stringify({ mappings }, null, 2);
  }, [mappings]);

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
              'Declare a schema, rename physical columns using “path”, optionally add a date “format”, and select a source column to use as “_id”.',
          })}
        </p>
      </EuiText>

      <EuiSpacer size="m" />

      {!validation.isValid ? (
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
                {validation.idPathError ? <li>{validation.idPathError}</li> : null}
                {Object.keys(validation.fieldErrorsById).length > 0 ? (
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
            label={
              <>
                {i18n.translate('xpack.dataFederation.mappingEditor.dynamicLabel', {
                  defaultMessage: 'dynamic',
                })}{' '}
                <EuiIconTip
                  content={i18n.translate('xpack.dataFederation.mappingEditor.dynamicHelp', {
                    defaultMessage:
                      'Controls undeclared columns. Use “false” to treat this declaration as the complete schema.',
                  })}
                  position="right"
                />
              </>
            }
            fullWidth
          >
            <EuiSelect
              fullWidth
              options={DYNAMIC_OPTIONS as unknown as Array<{ value: string; text: string }>}
              value={value.dynamic}
              onChange={onDynamicChange}
              data-test-subj="dataFederationMappingEditorDynamic"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('xpack.dataFederation.mappingEditor.idPathLabel', {
              defaultMessage: '_id.path',
            })}
            helpText={i18n.translate('xpack.dataFederation.mappingEditor.idPathHelp', {
              defaultMessage: 'Optional source column whose value becomes the row’s _id.',
            })}
            isInvalid={Boolean(validation.idPathError)}
            error={validation.idPathError}
            fullWidth
          >
            <EuiSelect
              isInvalid={Boolean(validation.idPathError)}
              fullWidth
              options={idPathOptions}
              value={value.idPath}
              onChange={(e) => onChange({ ...value, idPath: e.target.value })}
              data-test-subj="dataFederationMappingEditorIdPath"
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
                defaultMessage: 'Fields',
              })}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="plusCircle"
            size="s"
            flush="right"
            onClick={addField}
            data-test-subj="dataFederationMappingEditorAddField"
          >
            {i18n.translate('xpack.dataFederation.mappingEditor.addFieldButton', {
              defaultMessage: 'Add field',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      {value.fields.length === 0 ? (
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.dataFederation.mappingEditor.noFields', {
              defaultMessage: 'No fields declared yet.',
            })}
          </p>
        </EuiText>
      ) : (
        <EuiFlexGroup direction="column" gutterSize="s">
          {value.fields.map((f) => {
            const isDate = f.type === DataType.DATETIME;
            const rowErrors = validation.fieldErrorsById[f.id];
            return (
              <EuiFlexItem key={f.id}>
                <EuiPanel paddingSize="s" color="subdued" hasBorder={false}>
                  <EuiFlexGroup gutterSize="m" alignItems="flexStart">
                    <EuiFlexItem>
                      <EuiFormRow
                        label={i18n.translate('xpack.dataFederation.mappingEditor.logicalName', {
                          defaultMessage: 'Logical name',
                        })}
                        isInvalid={Boolean(rowErrors?.name)}
                        error={rowErrors?.name}
                        fullWidth
                      >
                        <EuiFieldText
                          isInvalid={Boolean(rowErrors?.name)}
                          fullWidth
                          value={f.name}
                          onChange={(e) => updateField(f.id, { name: e.target.value })}
                          data-test-subj="dataFederationMappingEditorFieldName"
                        />
                      </EuiFormRow>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiFormRow
                        label={i18n.translate('xpack.dataFederation.mappingEditor.physicalPath', {
                          defaultMessage: 'path (optional)',
                        })}
                        helpText={i18n.translate(
                          'xpack.dataFederation.mappingEditor.physicalPathHelp',
                          {
                            defaultMessage:
                              'Physical column name, if different from the logical name.',
                          }
                        )}
                        fullWidth
                      >
                        <EuiFieldText
                          fullWidth
                          value={f.path}
                          onChange={(e) => updateField(f.id, { path: e.target.value })}
                          data-test-subj="dataFederationMappingEditorFieldPath"
                        />
                      </EuiFormRow>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiFormRow
                        label={i18n.translate('xpack.dataFederation.mappingEditor.typeLabel', {
                          defaultMessage: 'type',
                        })}
                        isInvalid={Boolean(rowErrors?.type)}
                        error={rowErrors?.type}
                        fullWidth
                      >
                        <EuiSelect
                          isInvalid={Boolean(rowErrors?.type)}
                          fullWidth
                          options={
                            TYPE_OPTIONS as unknown as Array<{ value: string; text: string }>
                          }
                          value={f.type}
                          onChange={(e) => updateField(f.id, { type: e.target.value as DataType })}
                          data-test-subj="dataFederationMappingEditorFieldType"
                        />
                      </EuiFormRow>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiFormRow
                        label={i18n.translate('xpack.dataFederation.mappingEditor.formatLabel', {
                          defaultMessage: 'format (optional)',
                        })}
                        helpText={i18n.translate('xpack.dataFederation.mappingEditor.formatHelp', {
                          defaultMessage: 'Only applies to type date.',
                        })}
                        isInvalid={Boolean(rowErrors?.format)}
                        error={rowErrors?.format}
                        fullWidth
                      >
                        <EuiFieldText
                          isInvalid={Boolean(rowErrors?.format)}
                          fullWidth
                          disabled={!isDate}
                          value={f.format}
                          onChange={(e) => updateField(f.id, { format: e.target.value })}
                          data-test-subj="dataFederationMappingEditorFieldFormat"
                        />
                      </EuiFormRow>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiSpacer size="l" />
                      <EuiButtonEmpty
                        iconType="trash"
                        color="danger"
                        size="s"
                        onClick={() => removeField(f.id)}
                        data-test-subj="dataFederationMappingEditorRemoveField"
                      >
                        {i18n.translate('xpack.dataFederation.mappingEditor.removeField', {
                          defaultMessage: 'Remove',
                        })}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      )}

      {showJsonPreview ? (
        <>
          <EuiSpacer size="m" />
          <EuiTitle size="xs">
            <h4>
              {i18n.translate('xpack.dataFederation.mappingEditor.previewTitle', {
                defaultMessage: 'Request snippet',
              })}
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiCodeBlock language="json" isCopyable paddingSize="s">
            {previewJson ||
              '{\n  "mappings": {\n    "dynamic": "false",\n    "properties": {\n      "@timestamp": {\n        "type": "date",\n        "path": "event_time",\n        "format": "yyyy-MM-dd HH:mm:ss"\n      }\n    },\n    "_id": {\n      "path": "request_id"\n    }\n  }\n}'}
          </EuiCodeBlock>
        </>
      ) : null}
    </EuiPanel>
  );
};
