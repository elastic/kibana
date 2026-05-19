import React from 'react';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import type { DragDropIdentifier } from '@kbn/dom-drag-drop';
import type { DatasourceDataPanelProps, FramePublicAPI } from '@kbn/lens-common';
import type { IndexPatternServiceAPI } from '../../data_views_service/service';
interface DataPanelWrapperProps {
    showNoDataPopover: () => void;
    core: DatasourceDataPanelProps['core'];
    dropOntoWorkspace: (field: DragDropIdentifier) => void;
    hasSuggestionForField: (field: DragDropIdentifier) => boolean;
    plugins: {
        uiActions: UiActionsStart;
        dataViews: DataViewsPublicPluginStart;
        eventAnnotationService: EventAnnotationServiceType;
    };
    indexPatternService: IndexPatternServiceAPI;
    frame: FramePublicAPI;
}
export declare const DataPanelWrapper: React.MemoExoticComponent<(props: DataPanelWrapperProps) => React.JSX.Element>;
export {};
