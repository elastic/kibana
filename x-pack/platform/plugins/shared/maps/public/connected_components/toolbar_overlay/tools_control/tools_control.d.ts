import React, { Component } from 'react';
import type { GeoShapeRelation } from '@elastic/elasticsearch/lib/api/types';
import type { ActionExecutionContext, Action } from '@kbn/ui-actions-plugin/public';
import type { ES_GEO_FIELD_TYPE } from '../../../../common/constants';
import type { DrawState } from '../../../../common/descriptor_types';
export interface Props {
    cancelDraw: () => void;
    filterModeActive: boolean;
    getFilterActions?: () => Promise<Action[]>;
    getActionContext?: () => ActionExecutionContext;
    initiateDraw: (drawState: DrawState) => void;
    disableToolsControl: boolean;
}
interface State {
    isPopoverOpen: boolean;
}
export declare class ToolsControl extends Component<Props, State> {
    state: State;
    _togglePopover: () => void;
    _closePopover: () => void;
    _initiateShapeDraw: (options: {
        actionId: string;
        geometryLabel?: string;
        indexPatternId?: string;
        geoFieldName?: string;
        geoFieldType?: ES_GEO_FIELD_TYPE;
        relation?: GeoShapeRelation;
    }) => void;
    _initiateBoundsDraw: (options: {
        actionId: string;
        geometryLabel?: string;
        indexPatternId?: string;
        geoFieldName?: string;
        geoFieldType?: ES_GEO_FIELD_TYPE;
        relation?: GeoShapeRelation;
    }) => void;
    _initiateDistanceDraw: (options: {
        actionId: string;
        filterLabel: string;
    }) => void;
    _getDrawPanels(): ({
        id: number;
        title: string;
        items: {
            name: string;
            panel: number;
        }[];
        content?: undefined;
    } | {
        id: number;
        title: string;
        content: React.JSX.Element;
        items?: undefined;
    })[];
    _renderToolsButton(): React.JSX.Element;
    render(): React.JSX.Element;
}
export {};
