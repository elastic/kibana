import React from 'react';
import type { WindowParameters } from '@kbn/aiops-log-rate-analysis/window_parameters';
import type { SignificantItem } from '@kbn/ml-agg-utils';
interface LogRateAnalysisAttachmentsMenuProps {
    windowParameters?: WindowParameters;
    showLogRateAnalysisResults: boolean;
    significantItems: SignificantItem[];
}
export declare const LogRateAnalysisAttachmentsMenu: ({ windowParameters, showLogRateAnalysisResults, significantItems, }: LogRateAnalysisAttachmentsMenuProps) => React.JSX.Element;
export {};
