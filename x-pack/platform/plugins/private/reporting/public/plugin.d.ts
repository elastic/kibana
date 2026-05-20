import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { HomePublicPluginSetup, HomePublicPluginStart } from '@kbn/home-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { ManagementSetup, ManagementStart } from '@kbn/management-plugin/public';
import type { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { InjectedIntl } from '@kbn/i18n-react';
import type { ActionsPublicPluginSetup } from '@kbn/actions-plugin/public';
import type { ReportingSetup, ReportingStart } from '.';
export interface ReportingPublicPluginSetupDependencies {
    home: HomePublicPluginSetup;
    management: ManagementSetup;
    uiActions: UiActionsSetup;
    screenshotMode: ScreenshotModePluginSetup;
    share: SharePluginSetup;
    intl: InjectedIntl;
    actions: ActionsPublicPluginSetup;
}
export interface ReportingPublicPluginStartDependencies {
    home: HomePublicPluginStart;
    data: DataPublicPluginStart;
    management: ManagementStart;
    licensing: LicensingPluginStart;
    uiActions: UiActionsStart;
    share: SharePluginStart;
    actions: ActionsPublicPluginSetup;
}
/**
 * @internal
 * @implements Plugin
 */
export declare class ReportingPublicPlugin implements Plugin<ReportingSetup, ReportingStart, ReportingPublicPluginSetupDependencies, ReportingPublicPluginStartDependencies> {
    private kibanaVersion;
    private apiClient?;
    private readonly stop$;
    private readonly title;
    private readonly breadcrumbText;
    private config;
    private contract?;
    private startServices$?;
    private isServerless;
    constructor(initializerContext: PluginInitializerContext);
    private getContract;
    setup(core: CoreSetup<ReportingPublicPluginStartDependencies>, setupDeps: ReportingPublicPluginSetupDependencies): ReportingSetup;
    start(core: CoreStart): ReportingSetup;
    stop(): void;
}
export type Setup = ReturnType<ReportingPublicPlugin['setup']>;
export type Start = ReturnType<ReportingPublicPlugin['start']>;
