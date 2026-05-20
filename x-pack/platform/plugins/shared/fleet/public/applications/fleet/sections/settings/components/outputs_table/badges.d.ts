import React from 'react';
import type { Output } from '../../../../types';
export declare const DefaultBadges: React.NamedExoticComponent<{
    output: Pick<Output, "is_default" | "is_default_monitoring">;
}>;
export declare const DefaultOutputBadge: () => React.JSX.Element;
export declare const DefaultMonitoringOutputBadge: () => React.JSX.Element;
