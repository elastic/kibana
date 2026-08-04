import type { FC, ComponentProps } from 'react';
import { EuiPageHeader } from '@elastic/eui';
interface LicenseInfo {
    type: string;
    status: string;
    isExpired: boolean;
    expirationDate: string | null;
}
interface LicensePageHeaderProps extends Omit<ComponentProps<typeof EuiPageHeader>, 'pageTitle' | 'description'> {
    license: LicenseInfo;
}
export declare const ActiveLicensePageHeader: FC<LicensePageHeaderProps>;
export declare const ExpiredLicensePageHeader: FC<LicensePageHeaderProps>;
export declare const LicensePageHeader: FC;
export {};
