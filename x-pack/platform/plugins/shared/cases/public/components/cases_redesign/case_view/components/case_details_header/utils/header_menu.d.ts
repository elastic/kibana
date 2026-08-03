import type { AppHeaderMenu } from '@kbn/app-header';
import type { CasesPermissions } from '../../../../../../../common';
interface ExternalIncident {
    externalUrl?: string | null;
    externalTitle?: string | null;
}
interface GetMenuArgs {
    permissions: CasesPermissions;
    /**
     * Whether the current solution enables any case setting (alert syncing, observable extraction, or
     * metrics). When false the settings popover would be empty, so the button is omitted entirely.
     */
    hasCaseSettings: boolean;
    caseId: string;
    currentExternalIncident: ExternalIncident | null;
    chat: {
        addToChat: () => void;
        summarizeCase: () => void;
        isAddToChatAvailable: boolean;
    };
    onRefresh: () => void;
    onOpenSettings: (anchor: HTMLElement) => void;
    onCopyId: () => Promise<void>;
    onOpenDeleteModal: () => void;
}
export declare const getMenu: ({ permissions, hasCaseSettings, caseId, chat, currentExternalIncident, onRefresh, onOpenSettings, onCopyId, onOpenDeleteModal, }: GetMenuArgs) => AppHeaderMenu;
export {};
