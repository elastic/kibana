import React from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
export interface SeverityHeatmapDetailPanelProps {
    severityLabel: string;
    timestamp: string;
    eventData: Record<string, unknown> | null;
    euiTheme: EuiThemeComputed;
    onClose: () => void;
}
export declare const SeverityHeatmapDetailPanel: ({ severityLabel, timestamp, eventData, euiTheme, onClose, }: SeverityHeatmapDetailPanelProps) => React.JSX.Element;
