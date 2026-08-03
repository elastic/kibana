import type { ControlPanelsState } from '@kbn/control-group-renderer';
import { type LensAppServices, type LensSerializedState } from '@kbn/lens-common';
export declare const redirectToDashboard: ({ embeddableInput, dashboardId, originatingApp, getOriginatingPath, stateTransfer, controlsState, }: {
    embeddableInput: LensSerializedState;
    dashboardId: string;
    originatingApp?: string;
    getOriginatingPath?: (dashboardId: string) => string | undefined;
    stateTransfer: LensAppServices["stateTransfer"];
    controlsState?: ControlPanelsState;
}) => void;
