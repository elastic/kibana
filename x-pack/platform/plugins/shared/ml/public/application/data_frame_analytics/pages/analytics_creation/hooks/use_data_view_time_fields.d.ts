import type { CreateAnalyticsFormProps } from '../../analytics_management/hooks/use_create_analytics_form';
export declare const useDataViewTimeFields: ({ actions, state }: CreateAnalyticsFormProps) => {
    dataViewAvailableTimeFields: string[];
    onTimeFieldChanged: (e: React.ChangeEvent<HTMLSelectElement>) => void;
};
