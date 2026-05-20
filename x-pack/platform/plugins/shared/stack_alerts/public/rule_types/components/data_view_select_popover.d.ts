import React from 'react';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { DataView, DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { EsQueryRuleMetaData } from '../es_query/types';
export interface DataViewSelectPopoverProps {
    dependencies: {
        dataViews: DataViewsPublicPluginStart;
        dataViewEditor: DataViewEditorStart;
    };
    dataView?: DataView;
    metadata?: EsQueryRuleMetaData;
    onSelectDataView: (selectedDataView: DataView) => void;
    onChangeMetaData: (metadata: EsQueryRuleMetaData) => void;
}
export declare const DataViewSelectPopover: React.FunctionComponent<DataViewSelectPopoverProps>;
