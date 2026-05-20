import type { CoreStart } from '@kbn/core/public';
import type { Dispatch } from '@reduxjs/toolkit';
import type { DataViewsState, DatasourceState, VisualizationState, AddUserMessages, Datasource, FramePublicAPI, UserMessage, UserMessageFilters, UserMessagesDisplayLocationId, UserMessagesGetter, Visualization, LensPublicCallbacks } from '@kbn/lens-common';
export interface UserMessageGetterProps {
    visualizationType: string | null | undefined;
    visualization: Visualization | undefined;
    visualizationState: VisualizationState | undefined;
    activeDatasource: Datasource | null | undefined;
    activeDatasourceState: DatasourceState | null;
    dataViews: DataViewsState;
    core: CoreStart;
}
/**
 * Provides a place to register general user messages that don't belong in the datasource or visualization objects
 */
export declare const getApplicationUserMessages: ({ visualizationType, visualization, visualizationState, activeDatasource, activeDatasourceState, dataViews, core, }: UserMessageGetterProps) => UserMessage[];
export declare const handleMessageOverwriteFromConsumer: (messages: UserMessage[], onBeforeBadgesRender?: LensPublicCallbacks["onBeforeBadgesRender"]) => UserMessage[];
export declare const filterAndSortUserMessages: (userMessages: UserMessage[], locationId?: UserMessagesDisplayLocationId | UserMessagesDisplayLocationId[], { dimensionId, severity }?: UserMessageFilters) => UserMessage[];
export declare const useApplicationUserMessages: ({ coreStart, dispatch, activeDatasourceId, datasource, datasourceState, framePublicAPI, visualizationType, visualization, visualizationState, }: {
    activeDatasourceId: string | null;
    coreStart: CoreStart;
    datasource: Datasource | null;
    datasourceState: DatasourceState | null;
    dispatch: Dispatch;
    framePublicAPI: FramePublicAPI;
    visualizationType: string | null;
    visualizationState?: VisualizationState;
    visualization?: Visualization;
}) => {
    getUserMessages: UserMessagesGetter;
    addUserMessages: AddUserMessages;
};
