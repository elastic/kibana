import React from 'react';
export type Maybe<T> = T | null | undefined;
export declare function asPercent(numerator: Maybe<number>, denominator: number | undefined, fallbackResult?: string): string;
export declare const TIME_LABELS: {
    s: string;
    m: string;
    h: string;
    d: string;
};
export declare const getDomain: (series: Array<{
    name?: string;
    data: any[];
}>) => {
    xMax: number;
    xMin: number;
    yMax: number;
    yMin: number;
};
export declare function NoDataState(): React.JSX.Element;
export declare function LoadingState(): React.JSX.Element;
export declare function ErrorState(): React.JSX.Element;
interface PreviewChartLabel {
    field: string;
    timeSize: number;
    timeUnit: string;
    series: number;
    totalGroups: number;
}
export declare function TimeLabelForData({ field, timeSize, timeUnit, series, totalGroups, }: PreviewChartLabel): React.JSX.Element;
export {};
