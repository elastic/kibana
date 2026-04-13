import type { EuiTourState } from '@elastic/eui';
export declare const STREAMS_TOUR_CALLOUT_DISMISSED_KEY = "streams.tour.calloutDismissed";
export declare const STREAMS_TOUR_STATE_KEY = "streams.tour.state";
export type StreamsTourStepId = 'streams_list' | 'retention' | 'processing' | 'attachments' | 'advanced';
export declare const STEP_ID_TO_TAB: Record<StreamsTourStepId, string | undefined>;
export declare const TAB_TO_TOUR_STEP_ID: Record<string, StreamsTourStepId | undefined>;
export declare const DEFAULT_TOUR_STATE: EuiTourState;
