import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/public';
import type { SharePluginSetup } from '@kbn/share-plugin/public';
import type { ReportingAPIClient } from '@kbn/reporting-public';
interface MountParams extends AppMountParameters {
    apiClient: ReportingAPIClient;
    screenshotMode: ScreenshotModePluginSetup;
    share: SharePluginSetup;
}
export declare const mountRedirectApp: (coreStart: CoreStart, { element, apiClient, history, screenshotMode, share }: MountParams) => () => void;
export {};
