import type { FC } from 'react';
import type { CreateAnalyticsFormProps } from '../../../analytics_management/hooks/use_create_analytics_form';
interface Props {
    actions: CreateAnalyticsFormProps['actions'];
    state: CreateAnalyticsFormProps['state'];
}
export declare const RuntimeMappings: FC<Props>;
export {};
