import React from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
export interface SeverityHeatmapEventDataTableProps {
    eventData: Record<string, unknown> | null;
    euiTheme: EuiThemeComputed;
    dataTestSubj?: string;
    fullWidth?: boolean;
}
export declare const SeverityHeatmapEventDataTable: ({ eventData, euiTheme, dataTestSubj, fullWidth, }: SeverityHeatmapEventDataTableProps) => React.JSX.Element;
