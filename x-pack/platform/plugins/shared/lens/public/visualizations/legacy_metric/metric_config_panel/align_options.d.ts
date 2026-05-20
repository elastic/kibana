import React from 'react';
import type { LegacyMetricState } from '@kbn/lens-common';
export interface TitlePositionProps {
    state: LegacyMetricState;
    setState: (newState: LegacyMetricState) => void;
}
export declare const DEFAULT_TEXT_ALIGNMENT = "left";
export declare const AlignOptions: React.FC<TitlePositionProps>;
