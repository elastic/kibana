import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
export interface DataVisualizerDataViewManagementProps {
    /**
     * Currently selected data view
     */
    currentDataView?: DataView;
}
export declare function DataVisualizerDataViewManagement(props: DataVisualizerDataViewManagementProps): React.JSX.Element | null;
