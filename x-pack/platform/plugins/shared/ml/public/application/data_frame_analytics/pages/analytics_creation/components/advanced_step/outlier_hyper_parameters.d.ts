import type { FC } from 'react';
import type { CreateAnalyticsFormProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import type { AdvancedParamErrors } from './advanced_step_form';
interface Props extends CreateAnalyticsFormProps {
    advancedParamErrors: AdvancedParamErrors;
}
export declare const OutlierHyperParameters: FC<Props>;
export {};
