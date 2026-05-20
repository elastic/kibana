import type { FC } from 'react';
import React from 'react';
import type { AnalyticsJobType } from '../../../analytics_management/hooks/use_create_analytics_form/state';
interface Props {
    type: AnalyticsJobType;
    setFormState: React.Dispatch<React.SetStateAction<any>>;
}
export declare const JobType: FC<Props>;
export {};
