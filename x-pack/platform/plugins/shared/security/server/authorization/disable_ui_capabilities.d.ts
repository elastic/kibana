import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { Capabilities as UICapabilities } from '@kbn/core/types';
import type { ElasticsearchFeature, KibanaFeature } from '@kbn/features-plugin/server';
import type { AuthorizationServiceSetup } from '@kbn/security-plugin-types-server';
import type { AuthenticatedUser } from '../../common';
export declare function disableUICapabilitiesFactory(request: KibanaRequest, features: KibanaFeature[], elasticsearchFeatures: ElasticsearchFeature[], logger: Logger, authz: AuthorizationServiceSetup, user: AuthenticatedUser | null): {
    all: (uiCapabilities: UICapabilities) => UICapabilities;
    usingPrivileges: (uiCapabilities: UICapabilities) => Promise<UICapabilities>;
};
