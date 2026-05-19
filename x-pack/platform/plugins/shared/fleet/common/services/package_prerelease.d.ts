import type { IntegrationCardReleaseLabel, RegistryRelease } from '../types';
export declare function isPackagePrerelease(version: string): boolean;
export declare function getPackageReleaseLabel(version: string): IntegrationCardReleaseLabel;
export declare function mapPackageReleaseToIntegrationCardRelease(release: RegistryRelease): IntegrationCardReleaseLabel;
