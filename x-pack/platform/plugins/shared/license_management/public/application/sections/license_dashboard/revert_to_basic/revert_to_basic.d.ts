import React from 'react';
import type { LicenseType } from '@kbn/licensing-types';
import type { UploadStatusState } from '../../../store/types';
export interface Props {
    shouldShowRevertToBasicLicense: boolean;
    licenseType?: LicenseType;
    needsAcknowledgement: boolean;
    messages?: string[];
    startBasicLicense: (currentLicenseType: string, ack?: boolean) => void;
    cancelStartBasicLicense: () => void;
    uploadLicenseStatus?: (status: UploadStatusState) => void;
}
export declare class RevertToBasic extends React.PureComponent<Props> {
    cancel: () => void;
    acknowledgeModal(): React.JSX.Element | null;
    render(): React.JSX.Element | null;
}
