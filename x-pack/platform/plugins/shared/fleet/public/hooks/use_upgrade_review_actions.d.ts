import type { Installation } from '../../common/types';
export interface UpgradeReviewProps {
    pkgName: string;
    pkgTitle: string;
    pendingUpgradeReview: NonNullable<Installation['pending_upgrade_review']>;
}
export declare const useUpgradeReviewActions: ({ pkgName, pkgTitle, targetVersion, }: {
    pkgName: string;
    pkgTitle: string;
    targetVersion: string;
}) => {
    handleAccept: (onSuccess?: () => void) => void;
    handleDeclined: (onSuccess?: () => void) => void;
    handleReEnable: (onSuccess?: () => void) => void;
    isLoading: boolean;
};
