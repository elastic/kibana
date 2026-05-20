import { type FC } from 'react';
import type { CoreStart, OverlayStart } from '@kbn/core/public';
import type { NLPModelItem } from '@kbn/ml-common-types/trained_models';
interface ForceStopModelConfirmDialogProps {
    model: NLPModelItem;
    onCancel: () => void;
    onConfirm: (deploymentIds: string[]) => void;
}
/**
 * Confirmation is required when there are multiple model deployments
 * or associated pipelines.
 */
export declare const StopModelDeploymentsConfirmDialog: FC<ForceStopModelConfirmDialogProps>;
export declare const getUserConfirmationProvider: (overlays: OverlayStart, startServices: Pick<CoreStart, "analytics" | "i18n" | "theme" | "userProfile">) => (forceStopModel: NLPModelItem) => Promise<string[]>;
export {};
