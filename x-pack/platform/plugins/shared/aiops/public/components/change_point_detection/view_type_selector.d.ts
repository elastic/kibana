import type { FC } from 'react';
import type { ChangePointDetectionViewType } from '@kbn/aiops-change-point-detection/constants';
export interface ViewTypeSelectorProps {
    value: ChangePointDetectionViewType;
    onChange: (update: ChangePointDetectionViewType) => void;
}
export declare const ViewTypeSelector: FC<ViewTypeSelectorProps>;
