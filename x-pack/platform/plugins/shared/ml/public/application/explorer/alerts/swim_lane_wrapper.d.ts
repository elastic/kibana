import type { PropsWithChildren } from 'react';
import { type FC } from 'react';
import type { AnomalyDetectionAlert } from './anomaly_detection_alerts_state_service';
import type { AppStateSelectedCells, SwimlaneData } from '../explorer_utils';
export interface SwimLaneWrapperProps {
    selection?: AppStateSelectedCells | null;
    swimlaneContainerWidth?: number;
    swimLaneData: SwimlaneData;
}
/**
 * Wrapper component for the swim lane
 * that handles the popover for the selected cells.
 */
export declare const SwimLaneWrapper: FC<PropsWithChildren<SwimLaneWrapperProps>>;
export interface MiniAlertTableProps {
    data: AnomalyDetectionAlert[];
}
export declare const MiniAlertTable: FC<MiniAlertTableProps>;
