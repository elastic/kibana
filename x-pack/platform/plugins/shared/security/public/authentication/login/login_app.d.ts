import type { ApplicationSetup, HttpSetup, StartServicesAccessor } from '@kbn/core/public';
import type { ConfigType } from '../../config';
interface CreateDeps {
    application: ApplicationSetup;
    http: HttpSetup;
    getStartServices: StartServicesAccessor;
    config: Pick<ConfigType, 'loginAssistanceMessage' | 'sameSiteCookies'>;
}
export declare const loginApp: Readonly<{
    id: "security_login";
    create({ application, http, getStartServices, config }: CreateDeps): void;
}>;
export {};
