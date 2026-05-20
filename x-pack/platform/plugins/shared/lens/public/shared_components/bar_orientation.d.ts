import type { FC } from 'react';
type BarOrientation = 'vertical' | 'horizontal';
export interface BarOrientationProps {
    barOrientation?: BarOrientation;
    onBarOrientationChange: (newMode: BarOrientation) => void;
    isDisabled?: boolean;
}
export declare const BarOrientationSettings: FC<BarOrientationProps>;
export {};
