import type { FC } from 'react';
import type { CreateAnalyticsStepProps } from '../../../analytics_management/hooks/use_create_analytics_form';
export interface ValidationSummary {
    warning: number;
    success: number;
}
export declare const ValidationStepWrapper: FC<CreateAnalyticsStepProps>;
