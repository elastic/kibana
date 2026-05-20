import type { FleetErrorResponse } from '../../common';
import type { PackageInfo, PackageListItem } from '../types';
import type { RequestError } from '../hooks';
export declare function isPackageUnverified(pkg: PackageInfo | PackageListItem, packageVerificationKeyId?: string): boolean;
export declare const isVerificationError: (err?: FleetErrorResponse | RequestError) => boolean | undefined;
