import React from 'react';
import type { ComparisonHistogram, DataDriftField } from '../types';
export declare const OverlapDistributionComparison: ({ data, colors, fieldType, fieldName, secondaryType, }: {
    data: ComparisonHistogram[];
    colors: {
        referenceColor: string;
        comparisonColor: string;
    };
    secondaryType: string;
    fieldType?: DataDriftField["type"];
    fieldName?: DataDriftField["field"];
}) => React.JSX.Element;
