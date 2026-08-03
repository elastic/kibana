import type { FilesSetup } from '@kbn/files-plugin/public';
import type { Owner } from '../../common/constants/types';
import type { FilesConfig } from './types';
export declare const isRegisteredOwner: (ownerToCheck: string) => ownerToCheck is Owner;
export declare const registerCaseFileKinds: (config: FilesConfig, filesSetupPlugin: FilesSetup) => void;
