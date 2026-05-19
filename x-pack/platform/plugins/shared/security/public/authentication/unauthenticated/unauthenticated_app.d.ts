import type { ApplicationSetup, HttpSetup, StartServicesAccessor } from '@kbn/core/public';
import type { PluginStartDependencies } from '../../plugin';
interface CreateDeps {
    application: ApplicationSetup;
    http: HttpSetup;
    getStartServices: StartServicesAccessor<PluginStartDependencies>;
}
export declare const unauthenticatedApp: Readonly<{
    id: "security_unauthenticated";
    create({ application, http, getStartServices }: CreateDeps): void;
}>;
export {};
