import React from 'react';
import type { TickFormatter } from '@elastic/charts';
import type { FormattedChangePoint } from './utils/change_point';
interface Props {
    id: string;
    occurrences: Array<{
        x: number;
        y: number;
    }>;
    changes: FormattedChangePoint[];
    xFormatter: TickFormatter;
    height?: number;
    compressed?: boolean;
    maxYValue?: number;
}
export declare function SignificantEventsHistogramChart({ id, occurrences, changes, xFormatter, compressed, height, maxYValue, }: Props): React.JSX.Element;
export {};
