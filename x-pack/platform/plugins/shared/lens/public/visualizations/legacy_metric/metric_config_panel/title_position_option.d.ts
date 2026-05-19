import React from 'react';
import type { LegacyMetricState } from '@kbn/lens-common';
export interface TitlePositionProps {
    state: LegacyMetricState;
    setState: (newState: LegacyMetricState) => void;
}
export declare const DEFAULT_TITLE_POSITION = "top";
export declare const TitlePositionOptions: React.FC<TitlePositionProps>;
