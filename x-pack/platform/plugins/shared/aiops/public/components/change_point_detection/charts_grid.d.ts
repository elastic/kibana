import { type FC } from 'react';
import { type SelectedChangePoint } from './change_point_detection_context';
interface ChartsGridProps {
    changePoints: Record<number, SelectedChangePoint[]>;
}
/**
 * Shared component for change point charts grid.
 * Used both in AIOps UI and inside embeddable.
 *
 * @param changePoints
 * @constructor
 */
export declare const ChartsGrid: FC<{
    changePoints: SelectedChangePoint[];
    interval: string;
    onRenderComplete?: () => void;
}>;
/**
 * Wrapper component for change point charts grid.
 *
 * @param changePointsDict
 * @constructor
 */
export declare const ChartsGridContainer: FC<ChartsGridProps>;
export {};
