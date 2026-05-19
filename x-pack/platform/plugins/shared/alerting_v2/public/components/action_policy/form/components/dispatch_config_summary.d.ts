import type { GroupingMode, ThrottleStrategy } from '@kbn/alerting-v2-schemas';
import React from 'react';
interface DispatchConfigSummaryProps {
    groupingMode: GroupingMode;
    groupBy: string[];
    throttleStrategy: ThrottleStrategy;
    throttleInterval: string;
}
export declare const DispatchConfigSummary: (props: DispatchConfigSummaryProps) => React.JSX.Element | null;
export {};
