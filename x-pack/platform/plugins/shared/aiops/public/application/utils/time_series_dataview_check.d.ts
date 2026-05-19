import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
export declare function timeSeriesDataViewWarning(dataView: DataView, feature: 'change_point_detection' | 'log_categorization' | 'log_rate_analysis'): React.JSX.Element | null;
