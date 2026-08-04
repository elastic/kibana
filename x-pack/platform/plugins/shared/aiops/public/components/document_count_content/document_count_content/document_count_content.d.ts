import React, { type FC } from 'react';
import type { BarStyleAccessor, RectAnnotationSpec } from '@elastic/charts/dist/chart_types/xy_chart/utils/specs';
export interface DocumentCountContentProps {
    /** Optional color override for the default bar color for charts */
    barColorOverride?: string;
    /** Optional color override for the highlighted bar color for charts */
    barHighlightColorOverride?: string;
    baselineLabel?: string;
    deviationLabel?: string;
    barStyleAccessor?: BarStyleAccessor;
    baselineAnnotationStyle?: RectAnnotationSpec['style'];
    deviationAnnotationStyle?: RectAnnotationSpec['style'];
    attachmentsMenu?: React.ReactNode;
}
export declare const DocumentCountContent: FC<DocumentCountContentProps>;
