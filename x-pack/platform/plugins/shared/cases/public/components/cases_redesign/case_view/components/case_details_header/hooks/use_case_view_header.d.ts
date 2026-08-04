import type { CaseSeverity, CaseStatuses } from '../../../../../../../common/types/domain';
import type { CaseUI } from '../../../../../../../common';
import type { OnUpdateFields } from '../../../../../case_view/types';
interface UseCaseViewHeaderArgs {
    caseData: CaseUI;
    onStatusChanged: (status: CaseStatuses) => void;
    onSeverityChanged: (severity: CaseSeverity) => void;
    onUpdateField: (args: OnUpdateFields) => void;
}
export declare const useCaseViewHeader: ({ caseData, onStatusChanged, onSeverityChanged, onUpdateField, }: UseCaseViewHeaderArgs) => {
    headerTitle: import("@kbn/core/packages/chrome/browser").AppHeaderTitle;
    metadata: import("@kbn/core/packages/chrome/browser").AppHeaderMetadataItems;
    backHref: string;
    badges: import("@kbn/core/packages/chrome/browser").AppHeaderBadge[];
    menu: import("@kbn/core/packages/chrome/app-menu/core-chrome-app-menu-components").AppMenuConfig;
    isDeleteModalVisible: boolean;
    setIsDeleteModalVisible: import("react").Dispatch<import("react").SetStateAction<boolean>>;
    onConfirmDeletion: () => void;
    isSettingsOpen: boolean;
    setIsSettingsOpen: import("react").Dispatch<import("react").SetStateAction<boolean>>;
    settingsAnchor: HTMLElement | null;
};
export {};
