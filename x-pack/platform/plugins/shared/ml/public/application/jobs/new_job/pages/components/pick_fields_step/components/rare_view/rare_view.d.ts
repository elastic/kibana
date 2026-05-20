import type { FC } from 'react';
export declare enum RARE_DETECTOR_TYPE {
    RARE = 0,
    RARE_POPULATION = 1,
    FREQ_RARE_POPULATION = 2
}
interface Props {
    isActive: boolean;
    setCanProceed?: (proceed: boolean) => void;
}
export declare const RareView: FC<Props>;
export {};
