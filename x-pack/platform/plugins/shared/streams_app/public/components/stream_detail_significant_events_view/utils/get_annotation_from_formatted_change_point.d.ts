import React from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
import type { TickFormatter } from '@elastic/charts';
import type { FormattedChangePoint } from './change_point';
export declare function getAnnotationFromFormattedChangePoint({ theme, time, changes, xFormatter, }: {
    theme: EuiThemeComputed;
    time: number;
    changes: FormattedChangePoint[];
    xFormatter: TickFormatter;
}): {
    color: string;
    icon: React.JSX.Element;
    id: string;
    label: React.JSX.Element;
    x: number;
};
