import type { ChangePointDetectionViewType } from '@kbn/aiops-change-point-detection/constants';
/**
 * Titles for the cases toast messages
 */
export declare const CASES_TOAST_MESSAGES_TITLES: {
    CHANGE_POINT_DETECTION: (viewType: ChangePointDetectionViewType, chartsCount: number) => string;
    LOG_RATE_ANALYSIS: string;
    PATTERN_ANALYSIS: string;
};
