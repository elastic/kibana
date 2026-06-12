/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlToolParam } from '@kbn/agent-builder-common/tools/types/esql';
import {
  EsqlToolFieldType,
  type EsqlToolFieldTypes,
  type EsqlToolParamValue,
  type EsqlToolConfig,
} from '@kbn/agent-builder-common/tools/types/esql';

/**
 * Legacy/persisted param type values that may exist in older tool definitions.
 * These should not be exposed to users.
 */
export type LegacyEsqlToolFieldTypes =
  | 'text'
  | 'keyword'
  | 'long'
  | 'integer'
  | 'double'
  | 'float'
  | 'boolean'
  | 'date'
  | 'object'
  | 'nested';

export type LegacyEsqlToolParamValue =
  | string
  | number
  | boolean
  | Record<string, unknown>
  | Array<Record<string, unknown>>;
/**
 * Converts legacy mapping-derived types into the supported ES|QL tool param types.
 */
export const convertLegacyEsqlToolFieldType = (
  type: LegacyEsqlToolFieldTypes
): EsqlToolFieldTypes => {
  switch (type) {
    case 'text':
    case 'keyword':
    case 'object':
    case 'nested':
      return EsqlToolFieldType.STRING;
    case 'long':
    case 'integer':
      return EsqlToolFieldType.INTEGER;
    case 'double':
    case 'float':
      return EsqlToolFieldType.FLOAT;
    case 'boolean':
      return EsqlToolFieldType.BOOLEAN;
    case 'date':
      return EsqlToolFieldType.DATE;
  }
};

/**
 * Converts a legacy/persisted param defaultValue into a value compatible with the converted param type.
 *
 * Legacy configs may contain defaultValue types that are not supported anymore (e.g. object/nested),
 * so we stringify them.
 */
export const convertLegacyEsqlToolParamDefaultValue = (
  legacyType: LegacyEsqlToolFieldTypes,
  legacyDefaultValue: LegacyEsqlToolParamValue | undefined
): EsqlToolParamValue | undefined => {
  if (legacyType === 'object' || legacyType === 'nested') return JSON.stringify(legacyDefaultValue);
  return legacyDefaultValue as EsqlToolParamValue;
};

export interface LegacyEsqlToolParam extends Omit<EsqlToolParam, 'type' | 'defaultValue'> {
  type: LegacyEsqlToolFieldTypes;
  defaultValue?: LegacyEsqlToolParamValue;
}

export interface LegacyEsqlToolConfig {
  /**
   * Legacy persisted configuration marker.
   *
   * Newer configs use a numeric version; legacy configs are always undefined`.
   */
  schema_version: undefined;
  query: string;
  params: Record<string, LegacyEsqlToolParam>;
}

type EsqlToolStorageConfig = EsqlToolConfig & { schema_version: number };

/**
 * Persisted configuration shape for ES|QL tools.
 * Can be either a legacy config (schema_version: undefined) or a current config (schema_version: number).
 */
export type EsqlToolPersistedConfig = EsqlToolStorageConfig | LegacyEsqlToolConfig;

/**
 * schema_version is undefined for legacy configs
 */
export const isLegacyEsqlToolConfig = (
  config: EsqlToolPersistedConfig
): config is LegacyEsqlToolConfig => {
  return config.schema_version === undefined;
};
