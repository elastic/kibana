import type { TypeOf } from '@kbn/config-schema';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { GetEnrollmentSettingsResponse, AgentPolicy, EnrollmentSettingsFleetServerPolicy } from '../../../common/types';
import type { FleetRequestHandler, GetEnrollmentSettingsRequestSchema } from '../../types';
export declare const getEnrollmentSettingsHandler: FleetRequestHandler<undefined, TypeOf<typeof GetEnrollmentSettingsRequestSchema.query>>;
export declare const getFleetServerOrAgentPolicies: (soClient: SavedObjectsClientContract, agentPolicyId?: string, allFleetServerPolicies?: AgentPolicy[]) => Promise<{
    fleetServerPolicies?: EnrollmentSettingsFleetServerPolicy[];
    scopedAgentPolicy?: EnrollmentSettingsFleetServerPolicy;
}>;
export declare const getDownloadSource: (downloadSourceId?: string) => Promise<GetEnrollmentSettingsResponse["download_source"] | undefined>;
