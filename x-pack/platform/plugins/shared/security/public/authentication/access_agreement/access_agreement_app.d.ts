import type { ApplicationSetup, StartServicesAccessor } from '@kbn/core/public';
interface CreateDeps {
    application: ApplicationSetup;
    getStartServices: StartServicesAccessor;
}
export declare const accessAgreementApp: Readonly<{
    id: "security_access_agreement";
    create({ application, getStartServices }: CreateDeps): void;
}>;
export {};
