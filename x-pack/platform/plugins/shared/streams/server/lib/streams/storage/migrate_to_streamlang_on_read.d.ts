import type { Condition, StreamlangDSL } from '@kbn/streamlang';
import type { ConditionWithSteps, StreamlangStep } from '@kbn/streamlang/types/streamlang';
export declare const migrateRoutingIfConditionToStreamlang: (definition: Record<string, unknown>) => {
    ingest: {
        wired: {
            routing: {
                where: Condition;
            }[];
        };
    };
};
export declare const migrateOldProcessingArrayToStreamlang: (definition: Record<string, unknown>) => {
    ingest: {
        processing: StreamlangDSL;
    };
};
/**
 * These are just simplified versions of the old types to provide some type safety.
 */
/** Deprecated */
export interface OldBinaryFilterCondition {
    field: string;
    operator: string;
    value: string | number | boolean;
}
/** Deprecated */
export interface OldUnaryFilterCondition {
    field: string;
    operator: 'exists' | 'notExists';
}
/** Deprecated */
export type OldFilterCondition = OldBinaryFilterCondition | OldUnaryFilterCondition;
/** Deprecated */
export interface OldAndCondition {
    and: OldCondition[];
}
/** Deprecated */
export interface OldOrCondition {
    or: OldCondition[];
}
/** Deprecated */
export interface OldAlwaysCondition {
    always: {};
}
/** Deprecated */
export interface OldNeverCondition {
    never: {};
}
/** Deprecated */
export type OldCondition = OldFilterCondition | OldAndCondition | OldOrCondition | OldNeverCondition | OldAlwaysCondition;
/**
 * Legacy where block format (before condition property rename)
 * @deprecated Use StreamlangConditionBlock with 'condition' property instead
 */
export interface LegacyWhereBlock {
    customIdentifier?: string;
    where: ConditionWithSteps;
}
/**
 * Migrates old where blocks that use 'where' property to new format using 'condition' property.
 * This provides natural discrimination between where blocks and action steps with where clauses.
 */
export declare function migrateWhereBlocksToCondition(steps: unknown[]): {
    steps: StreamlangStep[];
    migrated: boolean;
};
