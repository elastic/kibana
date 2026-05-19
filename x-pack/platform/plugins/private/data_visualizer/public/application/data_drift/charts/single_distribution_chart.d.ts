import React from 'react';
import type { SeriesColorAccessor } from '@elastic/charts/dist/chart_types/xy_chart/utils/specs';
import type { Histogram } from '@kbn/ml-chi2test';
import type { DataDriftField, Feature } from '../types';
export declare const SingleDistributionChart: ({ data, color, fieldType, secondaryType, name, }: {
    data: Histogram[];
    name: string;
    secondaryType: string;
    color?: SeriesColorAccessor;
    fieldType?: DataDriftField["type"];
    domain?: Feature["domain"];
}) => React.JSX.Element;
