import { useLicense } from '../../../../../../../hooks';
import type { InstalledPackageUIPackageListItem } from '../types';
export declare const hasPreviousVersion: (item: InstalledPackageUIPackageListItem) => boolean;
export declare const isRollbackTTLExpired: (item: InstalledPackageUIPackageListItem) => boolean;
export declare const isInstalledFromRegistry: (item: InstalledPackageUIPackageListItem) => boolean;
export declare const checkRollbackAvailability: (item: InstalledPackageUIPackageListItem, licenseService: ReturnType<typeof useLicense>, isAvailableBackendCheck: boolean) => boolean;
export declare const useRollbackAvailablePackages: (items: InstalledPackageUIPackageListItem[]) => Record<string, boolean>;
