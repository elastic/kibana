import type { HttpServiceSetup, Logger } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { AuthorizationServiceSetup } from '@kbn/security-plugin-types-server';
export declare function initAppAuthorization(http: HttpServiceSetup, { actions, checkPrivilegesDynamicallyWithRequest, mode, }: Pick<AuthorizationServiceSetup, 'actions' | 'checkPrivilegesDynamicallyWithRequest' | 'mode'>, logger: Logger, featuresService: FeaturesPluginSetup): void;
