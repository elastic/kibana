import type { FC } from 'react';
import type { ANALYSIS_ADVANCED_FIELDS } from '@kbn/ml-data-frame-analytics-utils';
import type { CreateAnalyticsStepProps } from '../../../analytics_management/hooks/use_create_analytics_form';
export declare function getNumberValue(value?: number): number | "";
export type AdvancedParamErrors = {
    [key in ANALYSIS_ADVANCED_FIELDS]?: string;
};
export declare const AdvancedStepForm: FC<CreateAnalyticsStepProps>;
