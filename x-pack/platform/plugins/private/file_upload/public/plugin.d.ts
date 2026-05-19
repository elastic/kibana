import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FileUploadPluginStartApi } from './api';
export interface FileUploadPluginSetupDependencies {
}
export interface FileUploadPluginStartDependencies {
    data: DataPublicPluginStart;
}
export type FileUploadPluginSetup = ReturnType<FileUploadPlugin['setup']>;
export type FileUploadPluginStart = ReturnType<FileUploadPlugin['start']>;
export declare class FileUploadPlugin implements Plugin<FileUploadPluginSetup, FileUploadPluginStart, FileUploadPluginSetupDependencies, FileUploadPluginStartDependencies> {
    setup(core: CoreSetup): void;
    start(core: CoreStart, plugins: FileUploadPluginStartDependencies): FileUploadPluginStartApi;
}
