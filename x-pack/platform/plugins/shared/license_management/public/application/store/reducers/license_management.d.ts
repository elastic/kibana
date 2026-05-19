import moment from 'moment-timezone';
import type { LicenseManagementState } from '../types';
export declare const WARNING_THRESHOLD_IN_DAYS = 25;
export declare const licenseManagement: import("redux").Reducer<import("redux").CombinedState<{
    license: import("@kbn/licensing-types").ILicense | null;
    uploadStatus: import("../types").UploadStatusState;
    uploadErrorMessage: string;
    trialStatus: import("../types").TrialStatusState;
    startBasicStatus: import("../types").StartBasicStatusState;
    permissions: import("../types").PermissionsState;
}>, import("redux-actions").Action<import("@kbn/licensing-types").ILicense> | import("redux-actions").Action<import("../types").UploadStatusState> | import("redux-actions").Action<import("../types").StartBasicStatusState> | import("redux-actions").Action<string> | import("redux-actions").Action<boolean> | import("redux-actions").Action<unknown>>;
export declare const getPermission: (state: LicenseManagementState) => boolean | undefined;
export declare const isPermissionsLoading: (state: LicenseManagementState) => boolean | undefined;
export declare const getPermissionsError: (state: LicenseManagementState) => unknown;
export declare const getLicense: (state: LicenseManagementState) => import("@kbn/licensing-types").ILicense | null;
export declare const getLicenseType: (state: LicenseManagementState) => "basic" | "standard" | "gold" | "platinum" | "enterprise" | "trial" | undefined;
export declare const getExpirationMillis: (state: LicenseManagementState) => number | undefined;
export declare const getExpirationDate: (state: LicenseManagementState) => moment.Moment | null;
export declare const getExpirationDateFormatted: (state: LicenseManagementState) => string | null;
export declare const isExpired: (state: LicenseManagementState) => boolean;
export declare const isImminentExpiration: (state: LicenseManagementState) => boolean | null;
export declare const shouldShowRevertToBasicLicense: (state: LicenseManagementState) => boolean;
export declare const uploadNeedsAcknowledgement: (state: LicenseManagementState) => boolean;
export declare const isApplying: (state: LicenseManagementState) => boolean;
export declare const uploadMessages: (state: LicenseManagementState) => (string | string[])[] | undefined;
export declare const isInvalid: (state: LicenseManagementState) => boolean;
export declare const getUploadErrorMessage: (state: LicenseManagementState) => string;
export declare const shouldShowStartTrial: (state: LicenseManagementState) => boolean;
export declare const shouldShowRequestTrialExtension: (state: LicenseManagementState) => boolean;
export declare const startTrialError: (state: LicenseManagementState) => string | undefined;
export declare const startBasicLicenseNeedsAcknowledgement: (state: LicenseManagementState) => boolean;
export declare const getStartBasicMessages: (state: LicenseManagementState) => string[] | undefined;
export declare const getLicenseState: ((state: LicenseManagementState) => {
    type: "Basic" | "Standard" | "Gold" | "Platinum" | "Enterprise" | "Trial";
    isExpired: boolean;
    expirationDate: string | null;
    status: string;
}) & import("reselect").OutputSelectorFields<(args_0: import("@kbn/licensing-types").ILicense | null, args_1: string | null, args_2: boolean) => {
    type: "Basic" | "Standard" | "Gold" | "Platinum" | "Enterprise" | "Trial";
    isExpired: boolean;
    expirationDate: string | null;
    status: string;
}, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
