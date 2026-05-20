import type { PublishingSubject } from '@kbn/presentation-publishing';
import type { LensRuntimeState } from '@kbn/lens-common';
export interface PanelManagementApi {
    canShowConfig: () => boolean;
    isEditingEnabled: () => boolean;
    isNewPanel: () => boolean;
    onStopEditing: (isCancel: boolean, state: LensRuntimeState | undefined) => void;
}
export declare function setupPanelManagement(uuid: string, parentApi: unknown, { isNewlyCreated$, setAsCreated, isReadOnly, canEdit, }: {
    isNewlyCreated$: PublishingSubject<boolean>;
    setAsCreated: () => void;
    isReadOnly: () => boolean;
    canEdit: () => boolean;
}): PanelManagementApi;
