import { type TypeOf } from '@kbn/config-schema';
import type { DataStream } from '../models';
export interface GetDataStreamsResponse {
    data_streams: DataStream[];
}
export declare const DeprecatedILMPolicyCheckResponseSchema: import("@kbn/config-schema").ObjectType<{
    deprecatedILMPolicies: import("@kbn/config-schema").Type<Readonly<{} & {
        version: number;
        componentTemplates: string[];
        policyName: string;
    }>[]>;
}>;
export type DeprecatedILMPolicyCheckResponse = TypeOf<typeof DeprecatedILMPolicyCheckResponseSchema>;
