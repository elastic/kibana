import React from 'react';
import type { LegacyMetricState } from '@kbn/lens-common';
export interface TitlePositionProps {
    state: LegacyMetricState;
    setState: (newState: LegacyMetricState) => void;
}
export declare const DEFAULT_TITLE_SIZE = "m";
export declare const SizeOptions: React.FC<TitlePositionProps>;
