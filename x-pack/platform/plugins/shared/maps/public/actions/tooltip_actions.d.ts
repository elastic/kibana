import type { Dispatch } from 'redux';
import type { TooltipState } from '../../common/descriptor_types';
import type { MapStoreState } from '../reducers/store';
export declare function closeOnClickTooltip(tooltipId: string): (dispatch: Dispatch, getState: () => MapStoreState) => void;
export declare function openOnClickTooltip(tooltipState: TooltipState): (dispatch: Dispatch, getState: () => MapStoreState) => void;
export declare function closeOnHoverTooltip(): (dispatch: Dispatch, getState: () => MapStoreState) => void;
export declare function openOnHoverTooltip(tooltipState: TooltipState): {
    type: string;
    openTooltips: TooltipState[];
};
export declare function updateOpenTooltips(openTooltips: TooltipState[]): {
    type: string;
    openTooltips: TooltipState[];
};
