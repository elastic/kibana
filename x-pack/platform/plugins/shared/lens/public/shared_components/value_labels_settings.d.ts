import type { FC } from 'react';
import type { ValueLabelConfig } from '@kbn/lens-common';
export interface VisualOptionsProps {
    isVisible?: boolean;
    valueLabels?: ValueLabelConfig;
    onValueLabelChange: (newMode: ValueLabelConfig) => void;
    label?: string;
}
export declare const ValueLabelsSettings: FC<VisualOptionsProps>;
