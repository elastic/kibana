import type { EuiBasicTableColumn } from '@elastic/eui';
import type { EnrollmentAPIKey, GetAgentPoliciesResponseItem } from '../../../../types';
export declare const getColumns: ({ agentPoliciesById, agentPolicies, refresh, }: {
    agentPoliciesById: Record<string, GetAgentPoliciesResponseItem>;
    agentPolicies: GetAgentPoliciesResponseItem[];
    refresh: () => void;
}) => Array<EuiBasicTableColumn<EnrollmentAPIKey>>;
