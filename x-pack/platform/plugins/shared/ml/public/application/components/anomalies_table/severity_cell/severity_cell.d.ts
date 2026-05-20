import type { FC } from 'react';
interface SeverityCellProps {
    /**
     * Severity score.
     */
    score: number;
    /**
     * Flag to indicate whether the anomaly should be displayed in the cell as a
     * multi-bucket anomaly with a plus-shaped symbol.
     */
    isMultiBucketAnomaly: boolean;
}
/**
 * Renders anomaly severity score with single or multi-bucket impact marker.
 */
export declare const SeverityCell: FC<SeverityCellProps>;
export {};
