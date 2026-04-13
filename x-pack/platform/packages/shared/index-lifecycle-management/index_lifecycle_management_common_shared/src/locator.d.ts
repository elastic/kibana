import type { SerializableRecord } from '@kbn/utility-types';
export interface IlmLocatorParams extends SerializableRecord {
    page: 'policies_list' | 'policy_edit' | 'policy_create';
    policyName?: string;
}
