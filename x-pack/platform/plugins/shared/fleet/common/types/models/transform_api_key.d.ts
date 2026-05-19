import type { GrantAPIKeyResult } from '@kbn/security-plugin/server';
export interface TransformAPIKey extends GrantAPIKeyResult {
    /**
     * Generated encoded API key used for headers
     */
    encoded: string;
}
export interface SecondaryAuthorizationHeader {
    headers?: {
        'es-secondary-authorization': string | string[];
    };
}
