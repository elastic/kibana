import type { ApplicationSetup, HttpSetup, StartServicesAccessor } from '@kbn/core/public';
interface CreateDeps {
    application: ApplicationSetup;
    http: HttpSetup;
    getStartServices: StartServicesAccessor;
}
export declare const loggedOutApp: Readonly<{
    id: "security_logged_out";
    create({ application, http, getStartServices }: CreateDeps): void;
}>;
export {};
