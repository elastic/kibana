import type { CoreSetup, HttpSetup } from '@kbn/core/public';
interface CreateDeps {
    application: CoreSetup['application'];
    http: HttpSetup;
}
export declare const logoutApp: Readonly<{
    id: "security_logout";
    create({ application, http }: CreateDeps): void;
}>;
export {};
