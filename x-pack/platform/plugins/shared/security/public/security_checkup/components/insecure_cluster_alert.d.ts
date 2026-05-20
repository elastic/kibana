import type { AnalyticsServiceStart, CoreStart, DocLinksStart, I18nStart, MountPoint, ThemeServiceStart, UserProfileService } from '@kbn/core/public';
export declare const insecureClusterAlertTitle: string;
interface Deps {
    docLinks: DocLinksStart;
    analytics: Pick<AnalyticsServiceStart, 'reportEvent'>;
    i18n: I18nStart;
    theme: Pick<ThemeServiceStart, 'theme$'>;
    userProfile: UserProfileService;
    rendering: CoreStart['rendering'];
}
export declare const insecureClusterAlertText: (deps: Deps, onDismiss: (persist: boolean) => void) => MountPoint;
export {};
