import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/server';
import type { ConfigType } from '@kbn/screenshotting-server';
import { HeadlessChromiumDriverFactory } from './browsers';
import { Screenshots } from './screenshots';
interface SetupDeps {
    screenshotMode: ScreenshotModePluginSetup;
    cloud?: CloudSetup;
}
/**
 * Start public contract.
 */
export interface ScreenshottingStart {
    /**
     * Runs browser diagnostics.
     * @returns Observable with output messages.
     */
    diagnose: HeadlessChromiumDriverFactory['diagnose'];
    /**
     * Takes screenshots of multiple pages.
     * @param options Screenshots session options.
     * @returns Observable with screenshotting results.
     */
    getScreenshots: Screenshots['getScreenshots'];
}
export declare class ScreenshottingPlugin implements Plugin<void, ScreenshottingStart, SetupDeps> {
    private config;
    private logger;
    private packageInfo;
    private screenshotMode;
    private browserDriverFactory;
    private screenshots;
    constructor(context: PluginInitializerContext<ConfigType>);
    setup({ http }: CoreSetup, { screenshotMode, cloud }: SetupDeps): {};
    start({}: CoreStart): ScreenshottingStart;
    stop(): void;
}
export {};
