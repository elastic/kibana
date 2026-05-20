import type { History } from 'history';
import type { FC, PropsWithChildren } from 'react';
import type { CoreStart, StartServicesAccessor } from '@kbn/core/public';
import type { RegisterManagementAppArgs } from '@kbn/management-plugin/public';
import type { AuthenticationServiceSetup } from '@kbn/security-plugin-types-public';
import type { BreadcrumbsChangeHandler } from '../../components/breadcrumb';
import type { PluginStartDependencies } from '../../plugin';
interface CreateParams {
    authc: AuthenticationServiceSetup;
    getStartServices: StartServicesAccessor<PluginStartDependencies>;
}
export declare const usersManagementApp: Readonly<{
    id: "users";
    create({ authc, getStartServices }: CreateParams): RegisterManagementAppArgs;
}>;
export interface ProvidersProps {
    services: CoreStart;
    history: History;
    authc: AuthenticationServiceSetup;
    onChange?: BreadcrumbsChangeHandler;
}
export declare const Providers: FC<PropsWithChildren<ProvidersProps>>;
export {};
