import { z } from '@kbn/zod/v4';
import type { QueryStatus } from '../../../common/queries';
import type { RuleUnbackedFilter } from '../../lib/streams/assets/query/query_client';
export declare const queryStatusSchema: z.ZodOptional<z.ZodPreprocess<z.ZodArray<z.ZodEnum<{
    active: "active";
    draft: "draft";
}>>>>;
export declare function toRuleUnbackedFilter(statuses?: QueryStatus[]): RuleUnbackedFilter;
