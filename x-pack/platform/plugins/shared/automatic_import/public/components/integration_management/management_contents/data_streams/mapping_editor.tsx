/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Criteria, EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiInMemoryTable,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  EuiToken,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  FieldMapping,
  FieldTypeCompatibility,
  FieldTypeEditState,
  FieldTypeError,
  FieldTypeIssue,
  FieldTypeOverride,
} from '../../../../../common';
import {
  SUPPORTED_FIELD_TYPES,
  getFieldTypeCompatibility,
  getFieldValue,
  isSupportedFieldType,
} from '../../../../../common';
import { useUpdateDataStreamFieldTypes } from '../../../../common';
import { EDIT_PIPELINE_FLYOUT, TABLE_COLUMN_HEADERS } from './translations';
import { flattenPipelineObject, getIconFromType, unwrapPipelineDocument } from './utils';

interface MappingRow extends FieldMapping {
  value: string;
  values: unknown[];
  effectiveType: string;
  isPersisted: boolean;
  pendingType?: string;
  /** Set when a saved edit changed this field's type. */
  originalType?: string;
  /** The pending type looks incompatible, or the last Save failed. Does not block Save. */
  validationError?: string;
  /** Doesn't block Save. */
  warning?: string;
}

interface UseMappingEditorProps {
  integrationId: string;
  dataStreamId: string;
  version: string;
  fieldMappings?: FieldMapping[];
  fieldTypeOverrides?: FieldTypeOverride[];
  documents: Array<Record<string, unknown>>;
  activeDocument: number;
}

interface MappingEditorProps {
  editor: MappingEditorState;
  editState: FieldTypeEditState;
}

const getEditStateNotice = (editState: FieldTypeEditState): string => {
  switch (editState) {
    case 'locked':
      return i18n.translate('xpack.automaticImport.mappingEditor.readOnlyNotice', {
        defaultMessage:
          'Field types are locked because this data stream is already part of an approved and installed package. Newly added data streams stay editable until they are approved.',
      });
    case 'reanalyzing':
      return i18n.translate('xpack.automaticImport.mappingEditor.reanalyzingNotice', {
        defaultMessage:
          'Analysis is in progress. Field types will be editable when analysis completes.',
      });
    case 'loading':
      return i18n.translate('xpack.automaticImport.mappingEditor.loadingEditStateNotice', {
        defaultMessage: 'Checking whether field types can be edited…',
      });
    default:
      return i18n.translate('xpack.automaticImport.mappingEditor.editStateErrorNotice', {
        defaultMessage:
          'Field types cannot be edited because their edit status could not be loaded. Reload and try again.',
      });
  }
};

const KNOWN_ECS_FALLBACK_FIELDS = new Set(['@timestamp', 'message']);

// SuperSelect's dropdown inherits the trigger width, which is too narrow for
// types like `constant_keyword` when the current selection is a short name.
const TYPE_SELECT_PANEL_MIN_WIDTH = 300;

// Fits the type label, edit button and "Unsaved changes" badge without the
// Field column absorbing the leftover width.
const TYPE_COLUMN_WIDTH = '200px';

const getIssueDescription = (issue: FieldTypeIssue | undefined, type: string): string => {
  switch (issue) {
    case 'object_value':
      return i18n.translate('xpack.automaticImport.mappingEditor.issue.objectValue', {
        defaultMessage: 'Objects can’t be stored in a {type} field.',
        values: { type },
      });
    case 'multiple_constant_values':
      return i18n.translate('xpack.automaticImport.mappingEditor.issue.multipleConstantValues', {
        defaultMessage: 'The sample values are not constant across documents.',
      });
    case 'out_of_range':
      return i18n.translate('xpack.automaticImport.mappingEditor.issue.outOfRange', {
        defaultMessage: 'Values are out of range for {type}.',
        values: { type },
      });
    case 'negative_value':
      return i18n.translate('xpack.automaticImport.mappingEditor.issue.negativeValue', {
        defaultMessage: 'Values are negative.',
      });
    case 'not_numeric':
      return i18n.translate('xpack.automaticImport.mappingEditor.issue.notNumeric', {
        defaultMessage: 'Values are not numbers.',
      });
    case 'not_boolean':
      return i18n.translate('xpack.automaticImport.mappingEditor.issue.notBoolean', {
        defaultMessage: 'Values are not true or false.',
      });
    case 'not_ip':
      return i18n.translate('xpack.automaticImport.mappingEditor.issue.notIp', {
        defaultMessage: 'Values are not IP addresses.',
      });
    default:
      return i18n.translate('xpack.automaticImport.mappingEditor.issue.unknown', {
        defaultMessage: 'Values can’t be stored as {type}.',
        values: { type },
      });
  }
};

const formatCompatibilityMessage = (
  type: string,
  { issue, failingDocuments, totalDocuments }: FieldTypeCompatibility
): string =>
  i18n.translate('xpack.automaticImport.mappingEditor.compatibilityMessage', {
    defaultMessage:
      '{description} Affects {failingDocuments} of {totalDocuments} sample documents.',
    values: { description: getIssueDescription(issue, type), failingDocuments, totalDocuments },
  });

const formatServerError = (type: string, error: FieldTypeError): string =>
  formatCompatibilityMessage(type, {
    status: 'certain_failure',
    issue: error.issue as FieldTypeIssue | undefined,
    failingDocuments: error.failing_documents,
    totalDocuments: error.total_documents,
  });

const getTypeOptions = (type: string, originalType?: string): string[] => {
  const unsupportedTypes = [type, originalType].filter(
    (candidate): candidate is string =>
      typeof candidate === 'string' && !isSupportedFieldType(candidate)
  );
  return [...new Set([...unsupportedTypes, ...SUPPORTED_FIELD_TYPES])];
};

const formatValue = (value: unknown): string => {
  if (value === undefined) return '—';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
};

const createFallbackMappings = (document: Record<string, unknown> | undefined): FieldMapping[] => {
  if (!document) return [];
  return flattenPipelineObject(document).map(({ field, type }) => ({
    name: field,
    type,
    is_ecs: KNOWN_ECS_FALLBACK_FIELDS.has(field),
  }));
};

const FieldTypeDisplay = ({ type }: { type: string }) => (
  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiToken iconType={getIconFromType(type)} />
    </EuiFlexItem>
    <EuiFlexItem
      grow={false}
      css={css`
        white-space: nowrap;
      `}
    >
      {type}
    </EuiFlexItem>
  </EuiFlexGroup>
);

const mergeDocumentAndMappings = (
  document: Record<string, unknown> | undefined,
  fieldMappings: FieldMapping[] | undefined
): FieldMapping[] => {
  const mappingsFromApi = Array.isArray(fieldMappings)
    ? fieldMappings.filter((mapping) => typeof mapping.name === 'string' && mapping.name.length > 0)
    : [];
  const mappingByName = new Map(mappingsFromApi.map((mapping) => [mapping.name, mapping]));
  const flattened = document ? flattenPipelineObject(document) : [];

  const fromDocument = flattened.map(({ field, type }) => {
    const mapping = mappingByName.get(field);
    return {
      name: field,
      type: mapping?.type ?? type,
      is_ecs: mapping?.is_ecs ?? KNOWN_ECS_FALLBACK_FIELDS.has(field),
    };
  });

  if (fromDocument.length === 0) {
    return mappingsFromApi.length > 0 ? mappingsFromApi : createFallbackMappings(document);
  }

  const fromDocumentNames = new Set(fromDocument.map((mapping) => mapping.name));
  const mappingOnly = mappingsFromApi.filter((mapping) => !fromDocumentNames.has(mapping.name));
  return [...fromDocument, ...mappingOnly];
};

export const useMappingEditor = ({
  integrationId,
  dataStreamId,
  version,
  fieldMappings,
  fieldTypeOverrides,
  documents,
  activeDocument,
}: UseMappingEditorProps) => {
  const { updateDataStreamFieldTypesMutation } = useUpdateDataStreamFieldTypes();
  const unwrappedDocuments = useMemo(
    () =>
      documents
        .map((document) => unwrapPipelineDocument(document))
        .filter((document): document is Record<string, unknown> => document !== undefined),
    [documents]
  );
  const currentDocument = unwrappedDocuments[activeDocument];
  const sourceMappings = useMemo(
    () => mergeDocumentAndMappings(currentDocument, fieldMappings),
    [currentDocument, fieldMappings]
  );
  const originalTypes = useMemo(
    () => new Map((fieldTypeOverrides ?? []).map(({ name, original_type: type }) => [name, type])),
    [fieldTypeOverrides]
  );
  const [pendingTypes, setPendingTypes] = useState<Record<string, string>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, FieldTypeError>>({});
  const [inlineEditingField, setInlineEditingField] = useState<string | null>(null);

  useEffect(() => {
    setPendingTypes({});
    setServerErrors({});
    setInlineEditingField(null);
  }, [dataStreamId]);

  useEffect(() => {
    setInlineEditingField(null);
  }, [activeDocument]);

  const rows = useMemo<MappingRow[]>(() => {
    return sourceMappings.map((mapping) => {
      const pendingType = pendingTypes[mapping.name];
      const values = unwrappedDocuments.map((document) => getFieldValue(document, mapping.name));
      const compatibility = pendingType
        ? getFieldTypeCompatibility(pendingType, values)
        : undefined;
      const serverError = serverErrors[mapping.name];
      const displayedType = pendingType ?? mapping.type;

      let validationError: string | undefined;
      let warning: string | undefined;
      if (compatibility?.status === 'certain_failure') {
        validationError = formatCompatibilityMessage(displayedType, compatibility);
      } else if (serverError) {
        validationError = formatServerError(displayedType, serverError);
      } else if (pendingType && compatibility?.totalDocuments === 0) {
        warning = i18n.translate('xpack.automaticImport.mappingEditor.noSampleValueAvailable', {
          defaultMessage: 'No sample value is available to verify this type.',
        });
      }

      return {
        ...mapping,
        effectiveType: displayedType,
        isPersisted: Boolean(fieldMappings?.some(({ name }) => name === mapping.name)),
        value: formatValue(getFieldValue(currentDocument ?? {}, mapping.name)),
        values,
        originalType: originalTypes.get(mapping.name),
        ...(pendingType ? { pendingType } : {}),
        ...(validationError ? { validationError } : {}),
        ...(warning ? { warning } : {}),
      };
    });
  }, [
    currentDocument,
    fieldMappings,
    originalTypes,
    pendingTypes,
    serverErrors,
    sourceMappings,
    unwrappedDocuments,
  ]);

  const isDirty = Object.keys(pendingTypes).length > 0;
  const serverErrorNames = useMemo(() => Object.keys(serverErrors), [serverErrors]);

  const stageType = useCallback(
    (fieldName: string, nextType: string) => {
      setServerErrors(({ [fieldName]: _cleared, ...remaining }) => remaining);
      setPendingTypes((current) => {
        const savedType = sourceMappings.find(({ name }) => name === fieldName)?.type;
        if (nextType === savedType) {
          const { [fieldName]: _removed, ...remaining } = current;
          return remaining;
        }
        return { ...current, [fieldName]: nextType };
      });
    },
    [sourceMappings]
  );

  /** Resolves to true when the changes were saved. */
  const save = async (): Promise<boolean> => {
    const changes = Object.entries(pendingTypes).flatMap(([name, type]) =>
      isSupportedFieldType(type) || type === originalTypes.get(name) ? [{ name, type }] : []
    );
    if (changes.length === 0) return false;

    try {
      const response = await updateDataStreamFieldTypesMutation.mutateAsync({
        integrationId,
        dataStreamId,
        changes,
        version,
      });
      if (response.status === 'failure') {
        setServerErrors(Object.fromEntries(response.errors.map((error) => [error.name, error])));
        return false;
      }
      setPendingTypes({});
      setServerErrors({});
      setInlineEditingField(null);
      return true;
    } catch (_error) {
      // The mutation hook already shows an error toast.
      return false;
    }
  };

  const discardChanges = () => {
    setPendingTypes({});
    setServerErrors({});
    setInlineEditingField(null);
  };

  return {
    rows,
    isDirty,
    serverErrorNames,
    isSaving: updateDataStreamFieldTypesMutation.isLoading,
    inlineEditingField,
    setInlineEditingField,
    stageType,
    save,
    discardChanges,
  };
};

export type MappingEditorState = ReturnType<typeof useMappingEditor>;

export const MappingEditor = ({
  editor: { rows, inlineEditingField, setInlineEditingField, stageType, serverErrorNames },
  editState,
}: MappingEditorProps) => {
  const isEditable = editState === 'editable';
  // Controlled because the table resets to the first page whenever `items` changes,
  // which happens on every staged type change.
  const [{ pageIndex, pageSize }, setPage] = useState({ pageIndex: 0, pageSize: 10 });
  const [searchQuery, setSearchQuery] = useState('');
  const skipPageResetRef = useRef(false);
  const lastPageIndex = Math.max(0, Math.ceil(rows.length / pageSize) - 1);

  useEffect(() => {
    if (serverErrorNames.length === 0) return;
    // Clearing search makes EuiInMemoryTable report page 0. Ignore that reset so we can
    // keep the page that contains the first failing row.
    skipPageResetRef.current = true;
    setSearchQuery('');
    const firstIndex = rows.findIndex((row) => serverErrorNames.includes(row.name));
    if (firstIndex >= 0) {
      setPage((current) => ({
        ...current,
        pageIndex: Math.floor(firstIndex / current.pageSize),
      }));
    }
    const timeoutId = window.setTimeout(() => {
      skipPageResetRef.current = false;
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [serverErrorNames, rows]);

  const onTableChange = ({ page }: Criteria<MappingRow>) => {
    if (!page) return;
    if (skipPageResetRef.current) return;
    setPage({ pageIndex: page.index, pageSize: page.size });
  };

  const renderEditButton = (row: MappingRow) => {
    if (!isEditable || !row.isPersisted || row.is_ecs || row.type === 'group') return null;

    return (
      <EuiToolTip
        content={i18n.translate('xpack.automaticImport.mappingEditor.editTypeTooltip', {
          defaultMessage: 'Edit field type',
        })}
      >
        <EuiButtonIcon
          iconType="pencil"
          aria-label={i18n.translate('xpack.automaticImport.mappingEditor.editTypeAriaLabel', {
            defaultMessage: 'Select a type for {fieldName}',
            values: { fieldName: row.name },
          })}
          onClick={() => setInlineEditingField(row.name)}
          data-test-subj={`mappingEditorEditType-${row.name}`}
        />
      </EuiToolTip>
    );
  };

  const renderTypeSelect = (row: MappingRow) => {
    const displayedType = row.pendingType ?? row.type;
    const typeOptions = getTypeOptions(row.type, row.originalType);

    return (
      <EuiFormRow
        isInvalid={Boolean(row.validationError)}
        error={row.validationError}
        helpText={row.warning}
        display="rowCompressed"
      >
        <EuiSuperSelect
          fullWidth
          aria-label={i18n.translate('xpack.automaticImport.mappingEditor.editTypeAriaLabel', {
            defaultMessage: 'Select a type for {fieldName}',
            values: { fieldName: row.name },
          })}
          valueOfSelected={displayedType}
          options={typeOptions.map((option) => ({
            value: option,
            inputDisplay: <FieldTypeDisplay type={option} />,
            'data-test-subj': `mappingEditorTypeOption-${option}`,
          }))}
          onChange={(nextType) => {
            stageType(row.name, nextType);
            setInlineEditingField(null);
          }}
          isInvalid={Boolean(row.validationError)}
          popoverProps={{
            panelMinWidth: TYPE_SELECT_PANEL_MIN_WIDTH,
            repositionOnScroll: true,
          }}
          data-test-subj={`mappingEditorInlineTypeSelect-${row.name}`}
        />
      </EuiFormRow>
    );
  };

  const renderType = (row: MappingRow) => {
    if (
      isEditable &&
      row.isPersisted &&
      (inlineEditingField === row.name || Boolean(row.validationError))
    ) {
      return renderTypeSelect(row);
    }

    const displayedType = row.pendingType ?? row.type;
    const editButton = renderEditButton(row);

    return (
      <>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <FieldTypeDisplay type={displayedType} />
          </EuiFlexItem>
          {editButton && <EuiFlexItem grow={false}>{editButton}</EuiFlexItem>}
          {row.pendingType && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="warning">
                {i18n.translate('xpack.automaticImport.mappingEditor.unsavedChangesBadge', {
                  defaultMessage: 'Unsaved changes',
                })}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        {row.warning && (
          <EuiText size="xs" color="warning" data-test-subj={`mappingEditorWarning-${row.name}`}>
            {row.warning}
          </EuiText>
        )}
      </>
    );
  };

  const columns: Array<EuiBasicTableColumn<MappingRow>> = [
    {
      field: 'name',
      name: TABLE_COLUMN_HEADERS.field,
      width: '30%',
      sortable: true,
      truncateText: true,
    },
    {
      field: 'effectiveType',
      name: TABLE_COLUMN_HEADERS.type,
      width: TYPE_COLUMN_WIDTH,
      sortable: true,
      render: (_type: string, row: MappingRow) => renderType(row),
    },
    {
      field: 'value',
      name: TABLE_COLUMN_HEADERS.value,
      width: '40%',
      sortable: true,
      truncateText: true,
      render: (value: string) => (
        <EuiToolTip content={value} anchorProps={{ css: { display: 'block', maxWidth: '100%' } }}>
          <EuiText size="s" tabIndex={0}>
            {value}
          </EuiText>
        </EuiToolTip>
      ),
    },
  ];

  return (
    <>
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.automaticImport.mappingEditor.mappingGuidance', {
          defaultMessage:
            'Field types control the generated mappings. They do not change values produced by the ingest pipeline.',
        })}
      </EuiText>
      <EuiSpacer size="m" />
      {!isEditable && (
        <>
          <EuiText size="s" color="subdued" data-test-subj="mappingEditorReadOnlyNotice">
            {getEditStateNotice(editState)}
          </EuiText>
          <EuiSpacer size="m" />
        </>
      )}
      {serverErrorNames.length > 0 && (
        <>
          <EuiCallOut
            announceOnMount
            title={i18n.translate('xpack.automaticImport.mappingEditor.serverErrorsTitle', {
              defaultMessage: 'Some field types could not be saved',
            })}
            color="danger"
            iconType="error"
            data-test-subj="mappingEditorServerErrors"
          >
            <p>
              <FormattedMessage
                id="xpack.automaticImport.mappingEditor.serverErrorsDescription"
                defaultMessage="Failed for {fieldNames}."
                values={{ fieldNames: i18n.formatList('conjunction', serverErrorNames) }}
              />
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}
      <EuiInMemoryTable
        items={rows}
        columns={columns}
        searchFormat="text"
        search={{
          query: searchQuery,
          box: {
            incremental: true,
            placeholder: EDIT_PIPELINE_FLYOUT.filterPlaceholder,
          },
          onChange: ({ queryText }) => {
            setSearchQuery(queryText);
            if (skipPageResetRef.current) return;
            setPage((current) => ({ ...current, pageIndex: 0 }));
          },
        }}
        executeQueryOptions={{ defaultFields: ['name', 'effectiveType', 'value'] }}
        tableCaption={EDIT_PIPELINE_FLYOUT.tableCaption}
        pagination={{ pageIndex: Math.min(pageIndex, lastPageIndex), pageSize }}
        onTableChange={onTableChange}
        sorting
      />
    </>
  );
};
