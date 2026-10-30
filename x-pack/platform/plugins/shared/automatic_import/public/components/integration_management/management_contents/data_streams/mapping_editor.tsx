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
import { KbnDangerCallout } from '@kbn/ui-callout';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type {
  ApprovedFieldType,
  FieldMapping,
  FieldTypeCompatibility,
  DataStreamEditState,
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
import { EDIT_PIPELINE_FLYOUT, TABLE_COLUMN_HEADERS } from './translations';
import { flattenPipelineObject, getIconFromType, unwrapPipelineDocument } from './utils';

interface MappingRow extends FieldMapping {
  value: string;
  effectiveType: string;
  /** The field is in the field mapping, not only in the sample document. */
  isMapped: boolean;
  isUnsaved: boolean;
  pendingType?: string;
  /** Set when a saved edit changed this field's type. */
  originalType?: string;
  /** The field's type in an approved version. */
  approvedType?: string;
  /** The pending type looks incompatible, or the last Save failed. Does not block Save. */
  validationError?: string;
  warning?: string;
}

interface UseMappingEditorProps {
  dataStreamId: string;
  fieldMappings?: FieldMapping[];
  savedFieldMappings?: FieldMapping[];
  fieldTypeOverrides?: FieldTypeOverride[];
  approvedFieldTypes?: ApprovedFieldType[];
  isDataStreamApproved: boolean;
  documents: Array<Record<string, unknown>>;
  activeDocument: number;
  pendingTypes: Record<string, string>;
  serverErrors: Record<string, FieldTypeError>;
  stageType: (fieldName: string, type: string) => void;
}

interface MappingEditorProps {
  editor: MappingEditorState;
  editState: DataStreamEditState;
}

const getEditStateNotice = (editState: DataStreamEditState): string => {
  switch (editState) {
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

const getIssueDescription = (issue: string | undefined, type: string): string => {
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
    case 'not_date':
      return i18n.translate('xpack.automaticImport.mappingEditor.issue.notDate', {
        defaultMessage: 'Values are not ISO 8601 dates or epoch milliseconds.',
      });
    case 'convert_failed':
      return i18n.translate('xpack.automaticImport.mappingEditor.issue.convertFailed', {
        defaultMessage: 'The generated convert processor could not convert values to {type}.',
        values: { type },
      });
    case 'convert_unsupported':
      return i18n.translate('xpack.automaticImport.mappingEditor.issue.convertUnsupported', {
        defaultMessage:
          'Values were not converted to {type}. Check any conditions added to the generated convert processor.',
        values: { type },
      });
    case 'duplicate_generated_processor':
      return i18n.translate('xpack.automaticImport.mappingEditor.issue.duplicateProcessor', {
        defaultMessage: 'The ingest pipeline has more than one generated processor for this field.',
      });
    case 'invalid_convert_type':
      return i18n.translate('xpack.automaticImport.mappingEditor.issue.invalidConvertType', {
        defaultMessage: 'The generated processor for this field has an unsupported convert type.',
      });
    case 'unsupported_generated_processor':
      return i18n.translate('xpack.automaticImport.mappingEditor.issue.unsupportedProcessor', {
        defaultMessage:
          'This generated processor can’t change the type of this field. Remove it from the ingest pipeline.',
      });
    case 'approved_field_locked':
      return i18n.translate('xpack.automaticImport.mappingEditor.issue.approvedFieldLocked', {
        defaultMessage: 'Changing the type of this field could break data that is already indexed.',
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

/** Formats a field type error returned by the server. */
export const formatServerError = (
  type: string,
  {
    issue,
    failing_documents: failingDocuments,
    total_documents: totalDocuments,
    approved_type: approvedType,
  }: FieldTypeError
): string => {
  if (issue === 'approved_field_locked') return getIssueDescription(issue, approvedType ?? type);

  const checkedType = approvedType ?? type;
  const message =
    failingDocuments === undefined || totalDocuments === undefined
      ? getIssueDescription(issue, checkedType)
      : formatCompatibilityMessage(checkedType, {
          status: 'certain_failure',
          issue: issue as FieldTypeIssue | undefined,
          failingDocuments,
          totalDocuments,
        });
  if (approvedType === undefined) return message;
  return i18n.translate('xpack.automaticImport.mappingEditor.approvedTypeNote', {
    defaultMessage: '{message} It is {approvedType} in an approved version.',
    values: { message, approvedType },
  });
};

const getTypeOptions = (type: string, originalType?: string): string[] => {
  const unsupportedTypes = [type, originalType].filter(
    (candidate): candidate is string =>
      typeof candidate === 'string' && !isSupportedFieldType(candidate)
  );
  return [...new Set([...unsupportedTypes, ...SUPPORTED_FIELD_TYPES])];
};

const formatValue = (value: unknown): string => {
  if (value === undefined) return '—';
  if (Array.isArray(value) && value.length === 1) return formatValue(value[0]);
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
  dataStreamId,
  fieldMappings,
  savedFieldMappings,
  fieldTypeOverrides,
  approvedFieldTypes,
  isDataStreamApproved,
  documents,
  activeDocument,
  pendingTypes,
  serverErrors,
  stageType,
}: UseMappingEditorProps) => {
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
  const savedTypes = useMemo(
    () => new Map((savedFieldMappings ?? []).map(({ name, type }) => [name, type])),
    [savedFieldMappings]
  );
  const approvedTypes = useMemo(
    () => new Map((approvedFieldTypes ?? []).map(({ name, type }) => [name, type])),
    [approvedFieldTypes]
  );
  const [inlineEditingField, setInlineEditingField] = useState<string | null>(null);

  useEffect(() => {
    setInlineEditingField(null);
  }, [dataStreamId, activeDocument]);

  const rows = useMemo<MappingRow[]>(() => {
    return sourceMappings.map((mapping) => {
      const pendingType = pendingTypes[mapping.name];
      const compatibility = pendingType
        ? getFieldTypeCompatibility(
            pendingType,
            unwrappedDocuments.map((document) => getFieldValue(document, mapping.name))
          )
        : undefined;
      const serverError = serverErrors[mapping.name];
      const displayedType = pendingType ?? mapping.type;
      const savedType = savedTypes.get(mapping.name);
      const approvedType = mapping.is_ecs ? undefined : approvedTypes.get(mapping.name);

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
        isMapped: Boolean(fieldMappings?.some(({ name }) => name === mapping.name)),
        isUnsaved: savedType !== undefined && savedType !== displayedType,
        value: formatValue(getFieldValue(currentDocument ?? {}, mapping.name)),
        originalType: originalTypes.get(mapping.name),
        ...(approvedType ? { approvedType } : {}),
        ...(pendingType ? { pendingType } : {}),
        ...(validationError ? { validationError } : {}),
        ...(warning ? { warning } : {}),
      };
    });
  }, [
    approvedTypes,
    currentDocument,
    fieldMappings,
    originalTypes,
    pendingTypes,
    savedTypes,
    serverErrors,
    sourceMappings,
    unwrappedDocuments,
  ]);

  const serverErrorNames = useMemo(() => Object.keys(serverErrors), [serverErrors]);

  return {
    rows,
    serverErrorNames,
    inlineEditingField,
    setInlineEditingField,
    stageType,
    isDataStreamApproved,
  };
};

export type MappingEditorState = ReturnType<typeof useMappingEditor>;

export const MappingEditor = ({
  editor: {
    rows,
    inlineEditingField,
    setInlineEditingField,
    stageType,
    serverErrorNames,
    isDataStreamApproved,
  },
  editState,
}: MappingEditorProps) => {
  const isEditable = editState === 'editable';
  const canEditTypes = isEditable && !isDataStreamApproved;
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

  const canEditRow = (row: MappingRow) =>
    canEditTypes && row.isMapped && !row.is_ecs && row.type !== 'group';

  const renderEditButton = (row: MappingRow) => {
    if (!canEditRow(row)) return null;

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
    if (canEditRow(row) && (inlineEditingField === row.name || Boolean(row.validationError))) {
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
          {row.isUnsaved && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="warning">
                {i18n.translate('xpack.automaticImport.mappingEditor.unsavedChangesBadge', {
                  defaultMessage: 'Unsaved changes',
                })}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        {row.validationError && (
          <EuiText size="xs" color="danger" data-test-subj={`mappingEditorError-${row.name}`}>
            {row.validationError}
          </EuiText>
        )}
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
      ...(canEditTypes
        ? {
            nameTooltip: {
              content: i18n.translate('xpack.automaticImport.mappingEditor.typeColumnTooltip', {
                defaultMessage:
                  'Non-ECS field types can be edited until the data stream is approved.',
              }),
              icon: 'info',
              iconProps: { 'data-test-subj': 'mappingEditorTypeHeaderTip' },
            },
          }
        : {}),
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
          <KbnDangerCallout
            announceOnMount
            title={i18n.translate('xpack.automaticImport.mappingEditor.serverErrorsTitle', {
              defaultMessage: 'Some field types could not be saved',
            })}
            data-test-subj="mappingEditorServerErrors"
          >
            <p>
              <FormattedMessage
                id="xpack.automaticImport.mappingEditor.serverErrorsDescription"
                defaultMessage="Failed for {fieldNames}."
                values={{ fieldNames: i18n.formatList('conjunction', serverErrorNames) }}
              />
            </p>
          </KbnDangerCallout>
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
