import type { Logger } from '@kbn/core/server';
import type { KibanaFeature } from '@kbn/features-plugin/common';
import type { PrivilegeDeprecationsRolesByFeatureIdRequest, PrivilegeDeprecationsRolesByFeatureIdResponse } from '@kbn/security-plugin-types-server';
import type { SecurityLicense } from '../../common';
import type { AuthorizationServiceSetupInternal } from '../authorization';
export declare const getPrivilegeDeprecationsService: ({ authz, getFeatures, license, logger, }: {
    authz: Pick<AuthorizationServiceSetupInternal, "applicationName">;
    getFeatures(): Promise<KibanaFeature[]>;
    license: SecurityLicense;
    logger: Logger;
}) => Readonly<{
    getKibanaRolesByFeatureId: ({ context, featureId, }: PrivilegeDeprecationsRolesByFeatureIdRequest) => Promise<PrivilegeDeprecationsRolesByFeatureIdResponse>;
}>;
