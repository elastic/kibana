import type { ApplicationSetup, StartServicesAccessor } from '@kbn/core/public';
import type { AuthenticationServiceSetup } from '@kbn/security-plugin-types-public';
interface CreateDeps {
    application: ApplicationSetup;
    authc: Pick<AuthenticationServiceSetup, 'getCurrentUser'>;
    getStartServices: StartServicesAccessor;
}
export declare const overwrittenSessionApp: Readonly<{
    id: "security_overwritten_session";
    create({ application, authc, getStartServices }: CreateDeps): void;
}>;
export {};
