import React from 'react';
import type { Feature } from '../types';
export declare const DataDriftDistributionChart: ({ item, colors, secondaryType, }: {
    item: Feature | undefined;
    colors: {
        referenceColor: string;
        comparisonColor: string;
    };
    secondaryType: string;
    domain?: Feature["domain"];
}) => React.JSX.Element;
