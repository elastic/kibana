import type { RulesClientContext } from '../types';
import type { BulkAction } from '../types';
export declare const getAuthorizationFilter: (context: RulesClientContext, { action }: {
    action: BulkAction;
}) => Promise<import("@kbn/es-query").KueryNode | import("@kbn/utility-types").JsonObject | undefined>;
