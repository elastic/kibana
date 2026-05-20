import type { FunctionComponent } from 'react';
import type { ScopedHistory } from '@kbn/core/public';
import type { ReportingAPIClient } from '@kbn/reporting-public';
import type { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/public';
import type { SharePluginSetup } from '../shared_imports';
interface Props {
    apiClient: ReportingAPIClient;
    history: ScopedHistory;
    screenshotMode: ScreenshotModePluginSetup;
    share: SharePluginSetup;
}
export declare const RedirectApp: FunctionComponent<Props>;
export {};
