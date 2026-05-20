import type { FC } from 'react';
import type { RARE_DETECTOR_TYPE } from './rare_view';
interface Props {
    setIsValid: (na: boolean) => void;
    setRareDetectorType(t: RARE_DETECTOR_TYPE): void;
    rareDetectorType: RARE_DETECTOR_TYPE;
}
export declare const RareDetectors: FC<Props>;
export {};
