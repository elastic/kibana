import { type FC } from 'react';
import type { WindowParameters } from '@kbn/aiops-log-rate-analysis';
/**
 * Props for the DualBrush React Component
 */
interface DualBrushProps {
    /**
     * Min and max numeric timestamps for the two brushes
     */
    windowParameters: WindowParameters;
    /**
     * Min timestamp for x domain
     */
    min: number;
    /**
     * Max timestamp for x domain
     */
    max: number;
    /**
     * Callback function whenever the brush changes
     */
    onChange?: (windowParameters: WindowParameters, windowPxParameters: WindowParameters) => void;
    /**
     * Margin left
     */
    marginLeft: number;
    /**
     * Nearest timestamps to snap to the brushes to
     */
    snapTimestamps?: number[];
    /**
     * Width
     */
    width: number;
    /**
     * Whether the brush should be non-interactive. When true, the brush is still visible
     * but cannot be moved or resized by the user.
     */
    nonInteractive?: boolean;
}
/**
 * DualBrush React Component
 * Dual brush component that overlays the document count chart
 *
 * @param props DualBrushProps component props
 * @returns The DualBrush component.
 */
export declare const DualBrush: FC<DualBrushProps>;
export {};
