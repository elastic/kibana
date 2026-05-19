import type { FileJSON } from '@kbn/files-plugin/common';
import type { FilesSetup } from '@kbn/files-plugin/server';
import type { FilesConfig } from './types';
export declare const createMaxCallback: (config: FilesConfig) => (file: FileJSON) => number;
export declare const registerCaseFileKinds: (config: FilesConfig, filesSetupPlugin: FilesSetup, isFipsMode?: boolean) => void;
