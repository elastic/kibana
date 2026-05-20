import type { CoreStart, HttpSetup } from '@kbn/core/public';
import type { ApplicationStart } from '@kbn/core/public';
import type { NotificationsStart, IUiSettingsClient, OverlayStart, HttpStart } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { ConsolePluginStart } from '@kbn/console-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { FileUploadPluginStart } from '@kbn/file-upload-plugin/public';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import type { Config, ILicense } from '../types';
import type { DocumentationService, UiMetricService, ApiService, BreadcrumbService, FileReaderService } from './services';
export interface AppServices {
    breadcrumbs: BreadcrumbService;
    metric: UiMetricService;
    documentation: DocumentationService;
    api: ApiService;
    fileReader: FileReaderService;
    notifications: NotificationsStart;
    history: ManagementAppMountParams['history'];
    uiSettings: IUiSettingsClient;
    settings: SettingsStart;
    share: SharePluginStart;
    fileUpload: FileUploadPluginStart;
    application: ApplicationStart;
    license: ILicense | null;
    consolePlugin?: ConsolePluginStart;
    overlays: OverlayStart;
    http: HttpStart;
    config: Config;
}
type StartServices = Pick<CoreStart, 'analytics' | 'i18n' | 'theme' | 'userProfile'>;
export interface CoreServices extends StartServices {
    http: HttpSetup;
}
export declare const renderApp: (element: HTMLElement, services: AppServices, coreServices: CoreServices) => () => void;
export {};
