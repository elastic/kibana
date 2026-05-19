import type { PluginInitializerContext } from '@kbn/core-plugins-server';
/**
 * Screenshotting plugin entry point.
 */
export declare function plugin(pluginInitializerContext: PluginInitializerContext): Promise<import("./plugin").ScreenshottingPlugin>;
export { config } from '@kbn/screenshotting-server';
export type { PdfScreenshotOptions, PdfScreenshotResult, PngScreenshotOptions, PngScreenshotResult, } from './formats';
export type { ScreenshottingStart } from './plugin';
export type { ScreenshotOptions, ScreenshotResult } from './screenshots';
