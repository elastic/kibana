import type { EsqlToolParam } from '@kbn/agent-builder-common/tools/types/esql';
import { type EsqlToolFieldTypes, type EsqlToolParamValue, type EsqlToolConfig } from '@kbn/agent-builder-common/tools/types/esql';
/**
 * Legacy/persisted param type values that may exist in older tool definitions.
 * These should not be exposed to users.
 */
export type LegacyEsqlToolFieldTypes = 'text' | 'keyword' | 'long' | 'integer' | 'double' | 'float' | 'boolean' | 'date' | 'object' | 'nested';
export type LegacyEsqlToolParamValue = string | number | boolean | Record<string, unknown> | Array<Record<string, unknown>>;
/**
 * Converts legacy mapping-derived types into the supported ES|QL tool param types.
 */
export declare const convertLegacyEsqlToolFieldType: (type: LegacyEsqlToolFieldTypes) => EsqlToolFieldTypes;
/**
 * Converts a legacy/persisted param defaultValue into a value compatible with the converted param type.
 *
 * Legacy configs may contain defaultValue types that are not supported anymore (e.g. object/nested),
 * so we stringify them.
 */
export declare const convertLegacyEsqlToolParamDefaultValue: (legacyType: LegacyEsqlToolFieldTypes, legacyDefaultValue: LegacyEsqlToolParamValue | undefined) => EsqlToolParamValue | undefined;
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
type EsqlToolStorageConfig = EsqlToolConfig & {
    schema_version: number;
};
/**
 * Persisted configuration shape for ES|QL tools.
 * Can be either a legacy config (schema_version: undefined) or a current config (schema_version: number).
 */
export type EsqlToolPersistedConfig = EsqlToolStorageConfig | LegacyEsqlToolConfig;
/**
 * schema_version is undefined for legacy configs
 */
export declare const isLegacyEsqlToolConfig: (config: EsqlToolPersistedConfig) => config is LegacyEsqlToolConfig;
export {};
