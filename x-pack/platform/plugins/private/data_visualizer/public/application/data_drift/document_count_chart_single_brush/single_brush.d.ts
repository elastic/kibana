import { type FC } from 'react';
export declare const getSingleBrushWindowParameters: (clickTime: number, minTime: number, maxTime: number) => SingleBrushWindowParameters;
export declare const getSnappedSingleBrushWindowParameters: (windowParameters: SingleBrushWindowParameters, snapTimestamps: number[]) => SingleBrushWindowParameters;
export interface SingleBrushWindowParameters {
    /** Time range minimum value */
    min: number;
    /** Time range maximum value */
    max: number;
}
/**
 * Props for the SingleBrush React Component
 */
interface SingleBrushProps {
    /**
     * Unique id for the brush, as it's possible to have multiple instances
     */
    id?: string;
    /**
     * Min and max numeric timestamps for the two brushes
     */
    windowParameters: SingleBrushWindowParameters;
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
    onChange?: (windowParameters: SingleBrushWindowParameters, windowPxParameters: SingleBrushWindowParameters) => void;
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
}
/**
 * SingleBrush React Component
 * Single brush component that overlays the document count chart
 *
 * @param props SingleBrushProps component props
 * @returns The SingleBrush component.
 */
export declare const SingleBrush: FC<SingleBrushProps>;
export {};
