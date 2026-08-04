import type { FC } from 'react';
interface BrushBadgeProps {
    label: string;
    marginLeft: number;
    timestampFrom: number;
    timestampTo: number;
    width: number;
}
/**
 * Badge component
 * @param label - label
 * @param marginLeft - margin left
 * @param timestampFrom - start timestamp
 * @param timestampTo - ending timestamp
 * @param width - width of badge
 * @constructor
 */
export declare const BrushBadge: FC<BrushBadgeProps>;
export {};
