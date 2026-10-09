import type { UnionTypeOptions } from '@kbn/config-schema/src/types';
export declare const stringOrStringArraySchema: (options?: UnionTypeOptions<string | string[]>) => import("@kbn/config-schema").Type<string | string[]>;
export declare const excludedGapReasonsSchema: import("@kbn/config-schema").Type<("rule_did_not_run" | "rule_disabled")[]>;
export declare const optionalExcludedGapReasonsSchema: import("@kbn/config-schema").Type<("rule_did_not_run" | "rule_disabled")[] | undefined>;
