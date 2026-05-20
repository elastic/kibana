import type { PackageSpecIcon, PackageSpecScreenshot, RegistryImage } from '../../../../common/types';
export declare function useLinks(): {
    toSharedAssets: (path: string) => string;
    toPackageImage: (img: PackageSpecIcon | PackageSpecScreenshot | RegistryImage, pkgName: string, pkgVersion: string) => string | undefined;
    toRelativeImage: ({ path, packageName, version, }: {
        path: string;
        packageName: string;
        version: string;
    }) => string;
};
