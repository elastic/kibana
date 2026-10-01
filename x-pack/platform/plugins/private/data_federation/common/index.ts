/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export type { DataSource, DataSourceType, DataSourceWithSecrets } from './datasource_types';
export {
  ALL_DATA_SOURCE_TYPES,
  DATA_SOURCE_TYPES_TO_HELP_TEXT,
  DATA_SOURCE_TYPES_TO_ICONS,
  ES_REDACTED_SECRET_VALUE,
  SECRET_FIELDS_BY_TYPE,
  UI_MANAGED_SECRET_FIELDS_BY_TYPE,
} from './datasource_types';

export {
  isValidIndexName,
  validateIndexNameRules,
  type DataSourceNameValidationError,
  type DataSourceNameValidationResult,
} from './valdiate_index_name';

export const PLUGIN_ID = 'data_federation';

/** Base path for this plugin's HTTP APIs (internal). */
export const INTERNAL_API_BASE_PATH = '/internal/data_federation' as const;

/** GET — list data sources (proxies to Elasticsearch `GET /_query/datasource`). */
export const DATA_SOURCES_LIST_ROUTE_PATH = `${INTERNAL_API_BASE_PATH}/data_sources` as const;

/**
 * By-id data source routes (Kibana path; `{id}` is a path parameter).
 * - GET → Elasticsearch `GET /_query/datasource/{id}`
 * - PUT → Elasticsearch `PUT /_query/datasource/{id}` (create data source)
 * - DELETE → Elasticsearch `DELETE /_query/datasource/{id}`
 */
export const DATA_SOURCE_BY_ID_ROUTE_PATH = `${INTERNAL_API_BASE_PATH}/data_sources/{id}` as const;

/** Resolves `DATA_SOURCE_BY_ID_ROUTE_PATH` with a URL-encoded id segment. */
export function getDataSourceByIdApiPath(id: string): string {
  return DATA_SOURCE_BY_ID_ROUTE_PATH.replace('{id}', encodeURIComponent(id));
}

/** GET — list data sets (proxies to Elasticsearch `GET /_query/data_set`). */
export const DATA_SETS_LIST_ROUTE_PATH = `${INTERNAL_API_BASE_PATH}/dataset` as const;

/**
 * By-id data set routes (Kibana path; `{id}` is a path parameter).
 * - GET → Elasticsearch `GET /_query/data_set/{id}`
 * - PUT → Elasticsearch `PUT /_query/data_set/{id}` (create data set)
 * - DELETE → Elasticsearch `DELETE /_query/data_set/{id}`
 */
export const DATA_SET_BY_ID_ROUTE_PATH = `${INTERNAL_API_BASE_PATH}/dataset/{id}` as const;

/** Resolves `DATA_SET_BY_ID_ROUTE_PATH` with a URL-encoded id segment. */
export function getDataSetByIdApiPath(id: string): string {
  return DATA_SET_BY_ID_ROUTE_PATH.replace('{id}', encodeURIComponent(id));
}

/** Quote/escape character value Elasticsearch reads (case-insensitively) as "turned off". */
export const CSV_CHARACTER_NONE = 'none';

/** Escape sequences accepted for delimiter/quote/escape, mapped to the character Elasticsearch reads. */
const CHARACTER_SEQUENCES: Readonly<Record<string, string>> = {
  '\\t': '\t',
  '\\\\': '\\',
};

const LINE_TERMINATORS: readonly string[] = ['\n', '\r'];

/** Turns a typed `\t` or `\\` into the character Elasticsearch uses. */
export const decodeCsvCharacterSequence = (value: string): string =>
  CHARACTER_SEQUENCES[value] ?? value;

/** Whether `value` is a single non-line-terminator character or a supported escape sequence. */
export const isValidDelimiter = (value: string): boolean =>
  (value.length === 1 && !LINE_TERMINATORS.includes(value)) ||
  Object.hasOwn(CHARACTER_SEQUENCES, value);

/** Whether `value` is a valid delimiter-style character or `none` (any case). */
export const isValidQuoteOrEscapeCharacter = (value: string): boolean =>
  isValidDelimiter(value) || value.toLowerCase() === CSV_CHARACTER_NONE;

export type CsvCharacterSettingName = 'delimiter' | 'quote' | 'escape';

export type CsvCharacterSettings = Partial<
  Record<CsvCharacterSettingName | 'format' | 'mode', string>
>;

interface CsvCharacterDefaults {
  delimiter: string;
  quoting: boolean;
  escaping: boolean;
}

const DEFAULT_QUOTE_CHARACTER = '"';
const DEFAULT_ESCAPE_CHARACTER = '\\';

const CSV_CHARACTER_DEFAULTS_BY_FORMAT: Readonly<Record<string, CsvCharacterDefaults>> = {
  csv: { delimiter: ',', quoting: true, escaping: true },
  tsv: { delimiter: '\t', quoting: false, escaping: false },
};

const QUOTING_AND_ESCAPING_BY_MODE: Readonly<
  Record<string, Pick<CsvCharacterDefaults, 'quoting' | 'escaping'>>
> = {
  quoted: { quoting: true, escaping: true },
  escaped: { quoting: false, escaping: true },
  plain: { quoting: false, escaping: false },
};

/** The character Elasticsearch uses for a setting, or `undefined` when the setting is turned off. */
const resolveActiveCharacter = (
  value: string | undefined,
  isOnByDefault: boolean,
  defaultCharacter: string
): string | undefined => {
  if (!value) return isOnByDefault ? defaultCharacter : undefined;
  if (value.toLowerCase() === CSV_CHARACTER_NONE) return undefined;
  return decodeCsvCharacterSequence(value);
};

export type CsvQuotingSettings = Partial<
  Record<'format' | 'mode' | 'quote' | 'multi_value_syntax', string>
>;

/**
 * Whether Elasticsearch reads quoted fields, applying format and mode defaults. Without a mode,
 * `multi_value_syntax: brackets` selects `quoted`.
 */
export const isCsvQuotingEnabled = ({
  format,
  mode,
  quote,
  multi_value_syntax: multiValueSyntax,
}: CsvQuotingSettings): boolean => {
  if (quote) return quote.toLowerCase() !== CSV_CHARACTER_NONE;
  const effectiveMode = mode || (multiValueSyntax === 'brackets' ? 'quoted' : undefined);
  const defaults = effectiveMode
    ? QUOTING_AND_ESCAPING_BY_MODE[effectiveMode]
    : format
    ? CSV_CHARACTER_DEFAULTS_BY_FORMAT[format]
    : undefined;
  return defaults?.quoting ?? false;
};

/**
 * Returns the explicitly set delimiter/quote/escape settings that resolve to the same character as another
 * active one, applying the format and mode defaults the same way Elasticsearch does.
 */
export const getConflictingCsvCharacterSettings = (
  settings: CsvCharacterSettings
): CsvCharacterSettingName[] => {
  const formatDefaults = settings.format
    ? CSV_CHARACTER_DEFAULTS_BY_FORMAT[settings.format]
    : undefined;
  if (!formatDefaults) return [];

  const { quoting, escaping } =
    (settings.mode && QUOTING_AND_ESCAPING_BY_MODE[settings.mode]) || formatDefaults;
  const active: Record<CsvCharacterSettingName, string | undefined> = {
    delimiter: resolveActiveCharacter(settings.delimiter, true, formatDefaults.delimiter),
    quote: resolveActiveCharacter(settings.quote, quoting, DEFAULT_QUOTE_CHARACTER),
    escape: resolveActiveCharacter(settings.escape, escaping, DEFAULT_ESCAPE_CHARACTER),
  };
  const names: readonly CsvCharacterSettingName[] = ['delimiter', 'quote', 'escape'];

  return names.filter((name) => {
    const character = active[name];
    if (!settings[name] || character === undefined) return false;
    return names.some((other) => other !== name && active[other] === character);
  });
};

export type { Dataset, DataSetWithName, DatasetSettings } from './dataset_types';
export type {
  DatasetMappings,
  DatasetMappingProperty,
  DatasetMappingFieldType,
  DatasetMappingsDynamic,
} from './dataset_types';

export const PLUGIN_NAME = i18n.translate('xpack.dataFederation.pluginName', {
  defaultMessage: 'ES|QL Data Federation',
});

const DATA_SOURCES_PATH = '/_query/data_source';
const DATA_SETS_PATH = '/_query/dataset';
export const DATA_SOURCE_BY_ID_PATH = `${DATA_SOURCES_PATH}/{id}`;
export const DATA_SET_BY_ID_PATH = `${DATA_SETS_PATH}/{id}`;
