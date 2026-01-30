/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EMPTY_CONTENT = '-----';

export const FIELD_TYPE_MAP = {
  boolean: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableBooleanType', {
      defaultMessage: 'Boolean',
    }),
    readonly: false,
  },
  date: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableDateType', {
      defaultMessage: 'Date',
    }),
    readonly: false,
  },
  keyword: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableKeywordType', {
      defaultMessage: 'Keyword',
    }),
    readonly: false,
  },
  match_only_text: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableTextType', {
      defaultMessage: 'Text (match_only_text)',
    }),
    readonly: false,
  },
  long: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableNumberType', {
      defaultMessage: 'Number (long)',
    }),
    readonly: false,
  },
  double: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableNumberType', {
      defaultMessage: 'Number (double)',
    }),
    readonly: false,
  },
  ip: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableIpType', {
      defaultMessage: 'IP',
    }),
    readonly: false,
  },
  geo_point: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableGeoPointType', {
      defaultMessage: 'Geo point',
    }),
    readonly: false,
  },
  integer: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableIntegerType', {
      defaultMessage: 'Number (integer)',
    }),
    readonly: false,
  },
  short: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableShortType', {
      defaultMessage: 'Number (short)',
    }),
    readonly: false,
  },
  byte: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableByteType', {
      defaultMessage: 'Number (byte)',
    }),
    readonly: false,
  },
  float: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableFloatType', {
      defaultMessage: 'Number (float)',
    }),
    readonly: false,
  },
  half_float: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableHalfFloatType', {
      defaultMessage: 'Number (half_float)',
    }),
    readonly: false,
  },
  text: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableFullTextType', {
      defaultMessage: 'Text',
    }),
    readonly: false,
  },
  wildcard: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableWildcardType', {
      defaultMessage: 'Wildcard',
    }),
    readonly: false,
  },
  version: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableVersionType', {
      defaultMessage: 'Version',
    }),
    readonly: false,
  },
  unsigned_long: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableUnsignedLongType', {
      defaultMessage: 'Number (unsigned_long)',
    }),
    readonly: false,
  },
  date_nanos: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableDateNanosType', {
      defaultMessage: 'Date (nanoseconds)',
    }),
    readonly: false,
  },
  system: {
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableSystemType', {
      defaultMessage: 'System managed',
    }),
    readonly: true,
  },
} as const;

export type FieldTypeOption = keyof typeof FIELD_TYPE_MAP;

export const FIELD_STATUS_MAP = {
  inherited: {
    color: 'hollow',
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorInheritedStatusLabel', {
      defaultMessage: 'Inherited',
    }),
    tooltip: i18n.translate('xpack.streams.streamDetailSchemaEditorInheritedStatusTooltip', {
      defaultMessage: 'The mapping for this field is inherited from the parent stream.',
    }),
  },
  mapped: {
    color: 'success',
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorMappedStatusLabel', {
      defaultMessage: 'Mapped',
    }),
    tooltip: i18n.translate('xpack.streams.streamDetailSchemaEditorMappedStatusTooltip', {
      defaultMessage: 'This field is mapped as part of this stream.',
    }),
  },
  unmapped: {
    color: 'default',
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorUnmappedStatusLabel', {
      defaultMessage: 'Unmapped',
    }),
    tooltip: i18n.translate('xpack.streams.streamDetailSchemaEditorUnmappedStatusTooltip', {
      defaultMessage: 'The mapping for this field is not managed by this stream or a parent.',
    }),
  },
  dynamic: {
    color: 'default',
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorDynamicStatusLabel', {
      defaultMessage: 'Dynamic',
    }),
    tooltip: i18n.translate('xpack.streams.streamDetailSchemaEditorDynamicStatusTooltip', {
      defaultMessage: 'The mapping for this field is controlled by the underlying index template.',
    }),
  },
  pending: {
    color: 'warning',
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorPendingStatusLabel', {
      defaultMessage: 'Pending',
    }),
    tooltip: i18n.translate('xpack.streams.streamDetailSchemaEditorPendingStatusTooltip', {
      defaultMessage: 'This field has uncommitted changes.',
    }),
  },
};

export type FieldStatus = keyof typeof FIELD_STATUS_MAP;

export const TABLE_COLUMNS = {
  name: {
    display: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTablenameHeader', {
      defaultMessage: 'Field',
    }),
  },
  type: {
    display: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTabletypeHeader', {
      defaultMessage: 'Type',
    }),
  },
  format: {
    display: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableformatHeader', {
      defaultMessage: 'Format',
    }),
  },
  parent: {
    display: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableFieldParentHeader', {
      defaultMessage: 'Field Parent (Stream)',
    }),
  },
  status: {
    display: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTablestatusHeader', {
      defaultMessage: 'Mapping status',
    }),
  },
  source: {
    display: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTablesourceHeader', {
      defaultMessage: 'Source',
    }),
  },
  result: {
    display: i18n.translate('xpack.streams.streamDetailSchemaEditorFieldsTableresultHeader', {
      defaultMessage: 'Simulation result',
    }),
  },
} as const;

export type TableColumnName = keyof typeof TABLE_COLUMNS;

export const DEFAULT_TABLE_COLUMN_NAMES: TableColumnName[] = [
  'name',
  'type',
  'format',
  'parent',
  'status',
];

export const SUPPORTED_TABLE_COLUMN_NAMES = Object.keys(TABLE_COLUMNS) as TableColumnName[];
