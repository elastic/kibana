import React from 'react';
import type { RegistryImage, PackageSpecScreenshot } from '../../../../../../../../common/types';
type ScreenshotItem = RegistryImage | PackageSpecScreenshot;
interface ScreenshotProps {
    images: ScreenshotItem[];
    packageName: string;
    version: string;
}
export declare const Screenshots: React.FC<ScreenshotProps>;
export {};
