import React from 'react';
import type { TickFormatter } from '@elastic/charts';
import type { FormattedChangePoint } from './utils/change_point';
export declare function ChangePointSummary({ changes, xFormatter, }: {
    changes: FormattedChangePoint[];
    xFormatter: TickFormatter;
}): React.JSX.Element;
