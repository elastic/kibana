import type { FC } from 'react';
import type { CreateAnalyticsFormProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import { ANALYTICS_STEPS } from '../../page';
interface Props extends CreateAnalyticsFormProps {
    step: ANALYTICS_STEPS;
    showCreateDataView?: boolean;
}
export declare const CreateStep: FC<Props>;
export {};
