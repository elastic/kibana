import React from 'react';
import type { Coordinate } from '../../../common/types';
export declare function SparkPlot({ valueLabel, isLoading, series, }: {
    valueLabel: React.ReactNode;
    isLoading: boolean;
    series?: Coordinate[] | null;
}): React.JSX.Element;
