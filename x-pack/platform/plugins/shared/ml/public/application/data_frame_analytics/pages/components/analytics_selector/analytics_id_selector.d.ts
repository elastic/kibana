import React from 'react';
export interface AnalyticsSelectorIds {
    model_id?: string;
    job_id?: string;
    analysis_type?: string;
}
interface Props {
    setAnalyticsId: (update: AnalyticsSelectorIds) => void;
    jobsOnly?: boolean;
    setIsIdSelectorFlyoutVisible: React.Dispatch<React.SetStateAction<boolean>>;
}
export declare function AnalyticsIdSelector({ setAnalyticsId, jobsOnly, setIsIdSelectorFlyoutVisible, }: Props): React.JSX.Element;
export {};
