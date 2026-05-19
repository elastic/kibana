import type { History } from 'history';
import type { FC, PropsWithChildren } from 'react';
import type { ApplicationSetup, CoreStart, StartServicesAccessor } from '@kbn/core/public';
import type { AuthenticationServiceSetup } from '@kbn/security-plugin-types-public';
import type { SecurityApiClients } from '../components';
import type { BreadcrumbsChangeHandler } from '../components/breadcrumb';
interface CreateDeps {
    application: ApplicationSetup;
    authc: AuthenticationServiceSetup;
    securityApiClients: SecurityApiClients;
    getStartServices: StartServicesAccessor;
}
export declare const accountManagementApp: Readonly<{
    id: "security_account";
    create({ application, authc, getStartServices, securityApiClients }: CreateDeps): void;
}>;
export interface ProvidersProps {
    services: CoreStart;
    history: History;
    authc: AuthenticationServiceSetup;
    securityApiClients: SecurityApiClients;
    onChange?: BreadcrumbsChangeHandler;
}
export declare const Providers: FC<PropsWithChildren<ProvidersProps>>;
export {};
