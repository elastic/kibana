import type { FC, PropsWithChildren } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { AuthenticationServiceSetup, SecurityNavControlServiceStart } from '@kbn/security-plugin-types-public';
import type { SecurityLicense } from '../../common';
import type { SecurityApiClients } from '../components';
interface SetupDeps {
    securityLicense: SecurityLicense;
    logoutUrl: string;
    securityApiClients: SecurityApiClients;
}
interface StartDeps {
    core: CoreStart;
    authc: AuthenticationServiceSetup;
}
export declare class SecurityNavControlService {
    private securityLicense;
    private logoutUrl;
    private securityApiClients;
    private navControlRegistered;
    private securityFeaturesSubscription?;
    private readonly stop$;
    private userMenuLinks$;
    setup({ securityLicense, logoutUrl, securityApiClients }: SetupDeps): void;
    start({ core, authc }: StartDeps): SecurityNavControlServiceStart;
    stop(): void;
    private registerSecurityNavControl;
    private sortUserMenuLinks;
}
export interface ProvidersProps {
    authc: AuthenticationServiceSetup;
    services: CoreStart;
    securityApiClients: SecurityApiClients;
}
export declare const Providers: FC<PropsWithChildren<ProvidersProps>>;
export {};
