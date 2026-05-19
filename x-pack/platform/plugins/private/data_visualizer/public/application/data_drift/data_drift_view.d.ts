import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { WindowParameters } from '@kbn/aiops-log-rate-analysis';
import type { Query } from '@kbn/es-query';
import type { SearchQueryLanguage } from '@kbn/ml-query-utils';
import { type InitialSettings } from './use_data_drift_result';
interface DataDriftViewProps {
    windowParameters?: WindowParameters;
    dataView: DataView;
    searchString: Query['query'];
    searchQueryLanguage: SearchQueryLanguage;
    isBrushCleared: boolean;
    runAnalysisDisabled?: boolean;
    onReset: () => void;
    lastRefresh: number;
    onRefresh: () => void;
    initialSettings: InitialSettings;
    hasValidTimeField: boolean;
}
export declare const DataDriftView: ({ windowParameters, dataView, searchString, searchQueryLanguage, onReset, isBrushCleared, lastRefresh, onRefresh, initialSettings, hasValidTimeField, }: DataDriftViewProps) => React.JSX.Element;
export {};
