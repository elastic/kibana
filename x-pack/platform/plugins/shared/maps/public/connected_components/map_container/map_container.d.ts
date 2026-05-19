import '../../_index.scss';
import React, { Component } from 'react';
import type { Filter } from '@kbn/es-query';
import type { ActionExecutionContext, Action } from '@kbn/ui-actions-plugin/public';
import type { Observable } from 'rxjs';
import type { RawValue } from '../../../common/constants';
import { FLYOUT_STATE } from '../../reducers/ui';
import type { MapSettings } from '../../../common/descriptor_types';
import type { RenderToolTipContent } from '../../classes/tooltips/tooltip_property';
import type { ILayer } from '../../classes/layers/layer';
export interface Props {
    addFilters: ((filters: Filter[], actionId: string) => Promise<void>) | null;
    getFilterActions?: () => Promise<Action[]>;
    getActionContext?: () => ActionExecutionContext;
    onSingleValueTrigger?: (actionId: string, key: string, value: RawValue) => Promise<void>;
    isMapLoading: boolean;
    cancelAllInFlightRequests: () => void;
    exitFullScreen: () => void;
    flyoutDisplay: FLYOUT_STATE;
    isFullScreen: boolean;
    isTimesliderOpen: boolean;
    indexPatternIds: string[];
    mapInitError: string | null | undefined;
    renderTooltipContent?: RenderToolTipContent;
    title?: string;
    description?: string;
    settings: MapSettings;
    layerList: ILayer[];
    waitUntilTimeLayersLoad$: Observable<void>;
    isSharable: boolean;
    euiTheme?: any;
}
interface State {
    isInitialLoadRenderTimeoutComplete: boolean;
    domId: string;
    showFitToBoundsButton: boolean;
    showTimesliderButton: boolean;
}
export declare class MapContainer extends Component<Props, State> {
    private _isMounted;
    private _isInitalLoadRenderTimerStarted;
    state: State;
    componentDidMount(): void;
    componentDidUpdate(): void;
    componentWillUnmount(): void;
    _onInitialLoadRenderComplete: () => void;
    _loadShowFitToBoundsButton(): Promise<void>;
    _loadShowTimesliderButton(): Promise<void>;
    _startInitialLoadRenderTimer: () => void;
    render(): React.JSX.Element;
}
export {};
