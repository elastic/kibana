import type { IToasts } from '@kbn/core/public';
export declare function ensurePackageKibanaAssetsInstalled({ pkgName, pkgVersion, toasts, ...rest }: {
    pkgName: string;
    pkgVersion: string;
    toasts: IToasts;
} & ({
    currentSpaceId: string;
} | {
    spaceIds: string[];
})): Promise<void>;
