import type { ApplicationStart } from '@kbn/core/public';
import type { LogoutReason } from '../../common/types';
export declare class SessionExpired {
    private application;
    private logoutUrl;
    private tenant;
    constructor(application: ApplicationStart, logoutUrl: string, tenant: string);
    logout(reason: LogoutReason): void;
}
