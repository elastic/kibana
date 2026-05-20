import type { ApplicationSetup, FatalErrorsSetup, HttpSetup, StartServicesAccessor } from '@kbn/core/public';
import type { AuthenticationServiceSetup } from '@kbn/security-plugin-types-public';
import type { ConfigType } from '../config';
import type { PluginStartDependencies } from '../plugin';
interface SetupParams {
    application: ApplicationSetup;
    fatalErrors: FatalErrorsSetup;
    config: ConfigType;
    http: HttpSetup;
    getStartServices: StartServicesAccessor<PluginStartDependencies>;
}
export declare class AuthenticationService {
    setup({ application, fatalErrors, config, getStartServices, http, }: SetupParams): AuthenticationServiceSetup;
}
export {};
