import React, { type Dispatch, type PropsWithChildren } from 'react';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { Logger } from '@kbn/logging';
import type { PrivilegesAPIClientPublicContract, RolesAPIClient, SecurityLicense } from '@kbn/security-plugin-types-public';
import { type IDispatchAction, type IEditSpaceStoreState } from './reducers';
import type { SpacesManager } from '../../../spaces_manager';
export interface EditSpaceProviderRootProps extends Pick<CoreStart, 'userProfile' | 'theme' | 'i18n' | 'overlays' | 'http' | 'notifications'> {
    logger: Logger;
    capabilities: ApplicationStart['capabilities'];
    getUrlForApp: ApplicationStart['getUrlForApp'];
    navigateToUrl: ApplicationStart['navigateToUrl'];
    serverBasePath: string;
    spacesManager: SpacesManager;
    getIsRoleManagementEnabled: () => Promise<() => boolean | undefined>;
    getRolesAPIClient: () => Promise<RolesAPIClient>;
    getPrivilegesAPIClient: () => Promise<PrivilegesAPIClientPublicContract>;
    getSecurityLicense: () => Promise<SecurityLicense>;
    enableSecurityLink: string;
}
interface EditSpaceClients {
    spacesManager: SpacesManager;
    rolesClient: RolesAPIClient;
    privilegesClient: PrivilegesAPIClientPublicContract;
}
export interface EditSpaceServices extends Omit<EditSpaceProviderRootProps, 'getRolesAPIClient' | 'getPrivilegesAPIClient' | 'getSecurityLicense' | 'getIsRoleManagementEnabled'> {
    invokeClient<R extends unknown>(arg: (clients: EditSpaceClients) => Promise<R>): Promise<R>;
    license?: SecurityLicense;
    isRoleManagementEnabled: boolean;
}
export interface EditSpaceStore {
    state: IEditSpaceStoreState;
    dispatch: Dispatch<IDispatchAction>;
}
/**
 *
 * @description EditSpaceProvider is a provider component that wraps the children components with the necessary context providers for the Edit Space feature. It provides the necessary services and state management for the feature,
 * this is provided as an export for use with out of band renders within the spaces app
 */
export declare const EditSpaceProvider: ({ children, state, dispatch, ...services }: PropsWithChildren<EditSpaceServices & EditSpaceStore>) => React.JSX.Element;
/**
 * @description EditSpaceProviderRoot is the root provider for the Edit Space feature. It instantiates the necessary services and state management for the feature. It ideally
 * should only be rendered once
 */
export declare const EditSpaceProviderRoot: ({ children, ...services }: PropsWithChildren<EditSpaceProviderRootProps>) => React.JSX.Element;
export declare const useEditSpaceServices: () => EditSpaceServices;
export declare const useEditSpaceStore: () => EditSpaceStore;
export {};
