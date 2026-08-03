import type { Action } from '@elastic/eui/src/components/basic_table/action_types';
import type { MutableRefObject } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { CombinedQuery } from '../../../../index_data_visualizer/types/combined_query';
import type { FieldVisConfig } from '../../stats_table/types';
import type { DataVisualizerKibanaReactContextValue } from '../../../../kibana_context';
export declare function getActions(dataView: DataView, services: Partial<DataVisualizerKibanaReactContextValue['services']>, combinedQuery: CombinedQuery, dataViewEditorRef: MutableRefObject<(() => void | undefined) | undefined> | undefined): Array<Action<FieldVisConfig>>;
