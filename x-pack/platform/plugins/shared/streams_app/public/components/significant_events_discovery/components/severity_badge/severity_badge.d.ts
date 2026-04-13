import { type EuiBadgeProps } from '@elastic/eui';
import React from 'react';
type Severity = 'low' | 'medium' | 'high' | 'critical';
export declare const SIGNIFICANT_EVENT_SEVERITY: Record<Severity, {
    color: EuiBadgeProps['color'];
    label: string;
    defaultValue: number;
}>;
export declare const scoreSeverity: (score: number) => Severity;
export declare function SeverityBadge({ score }: {
    score?: number;
}): React.JSX.Element;
export {};
