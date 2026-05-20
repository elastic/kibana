import type { FC } from 'react';
import type { DFAModelItem } from '@kbn/ml-common-types/trained_models';
export interface AddInferencePipelineFlyoutProps {
    onClose: () => void;
    model: DFAModelItem;
}
export declare const AddInferencePipelineFlyout: FC<AddInferencePipelineFlyoutProps>;
