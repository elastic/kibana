import type { FC } from 'react';
import type { CreateAnalyticsStepProps } from '../../../analytics_management/hooks/use_create_analytics_form';
export interface ConfigurationStepProps extends CreateAnalyticsStepProps {
    isClone: boolean;
    sourceDataViewTitle: string;
}
export declare const ConfigurationStep: FC<ConfigurationStepProps>;
