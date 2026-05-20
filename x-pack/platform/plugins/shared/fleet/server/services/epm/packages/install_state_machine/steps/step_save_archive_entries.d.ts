import type { PackageAssetReference } from '../../../../../types';
import type { InstallContext } from '../_state_machine_package_install';
export declare function stepSaveArchiveEntries(context: InstallContext): Promise<{
    packageAssetRefs: PackageAssetReference[];
}>;
export declare function cleanupArchiveEntriesStep(context: InstallContext): Promise<void>;
