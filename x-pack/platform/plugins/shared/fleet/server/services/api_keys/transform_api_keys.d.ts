import type { CreateRestAPIKeyParams, CreateRestAPIKeyWithKibanaPrivilegesParams } from '@kbn/security-plugin/server';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core/server';
import type { TransformAPIKey, SecondaryAuthorizationHeader } from '../../../common/types/models/transform_api_key';
export declare function isTransformApiKey(arg: any): arg is TransformAPIKey;
/** This function generates a new API based on current Kibana's user request.headers.authorization
 * then formats it into a es-secondary-authorization header object
 * @param request: The Kibana request to extract authorization from
 * @param createParams
 */
export declare function generateTransformSecondaryAuthHeaders({ request, createParams, logger, username, pkgName, pkgVersion, }: {
    request?: KibanaRequest;
    logger: Logger;
    createParams?: CreateRestAPIKeyParams | CreateRestAPIKeyWithKibanaPrivilegesParams;
    username?: string;
    pkgName?: string;
    pkgVersion?: string;
}): Promise<SecondaryAuthorizationHeader | undefined>;
