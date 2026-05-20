import { type FC } from 'react';
import type { ModelDownloadItem } from '@kbn/ml-common-types/trained_models';
export interface AddModelFlyoutProps {
    modelDownloads: ModelDownloadItem[];
    onClose: () => void;
    onSubmit: (modelId: string) => void;
}
export type AddModelFlyoutTabId = 'clickToDownload' | 'manualDownload';
/**
 * Flyout for downloading elastic curated models and showing instructions for importing third-party models.
 */
export declare const AddModelFlyout: FC<AddModelFlyoutProps>;
