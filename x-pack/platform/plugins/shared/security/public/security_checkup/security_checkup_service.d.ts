import type { AnalyticsServiceStart, CoreStart, DocLinksStart, HttpSetup, HttpStart, I18nStart, NotificationsStart, ThemeServiceStart, UserProfileService } from '@kbn/core/public';
import type { ConfigType } from '../config';
interface SetupDeps {
    http: HttpSetup;
}
interface StartDeps {
    http: HttpStart;
    notifications: NotificationsStart;
    docLinks: DocLinksStart;
    analytics: Pick<AnalyticsServiceStart, 'reportEvent'>;
    i18n: I18nStart;
    theme: Pick<ThemeServiceStart, 'theme$'>;
    userProfile: UserProfileService;
    rendering: CoreStart['rendering'];
}
export declare class SecurityCheckupService {
    private enabled;
    private alertVisibility$;
    private storage;
    private alertToast?;
    private storageKey?;
    constructor(config: Pick<ConfigType, 'showInsecureClusterWarning'>, storage: Storage);
    setup({ http }: SetupDeps): void;
    start(startDeps: StartDeps): void;
    private initializeAlert;
    private getSecurityCheckupState;
    private setAlertVisibility;
    private getPersistedVisibilityPreference;
    private setPersistedVisibilityPreference;
}
export {};
