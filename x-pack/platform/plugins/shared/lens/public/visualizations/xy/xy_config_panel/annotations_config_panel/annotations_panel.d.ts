import React from 'react';
import type { DatatableUtilitiesService } from '@kbn/data-plugin/common';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { VisualizationDimensionEditorProps, XYVisualizationState } from '@kbn/lens-common';
export declare const AnnotationsPanel: (props: VisualizationDimensionEditorProps<XYVisualizationState> & {
    datatableUtilities: DatatableUtilitiesService;
    dataViewsService: DataViewsPublicPluginStart;
}) => React.JSX.Element | null;
