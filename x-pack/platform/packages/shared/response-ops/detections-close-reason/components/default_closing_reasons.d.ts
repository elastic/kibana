export declare const DEFAULT_DETECTIONS_CLOSE_REASONS_KEY: "securitySolution:detectionsCloseReasons";
interface DefaultClosingReasonOption {
    key?: string;
    label: string;
}
export declare const DEFAULT_CLOSING_REASON_OPTIONS: DefaultClosingReasonOption[];
export declare const getDefaultClosingReasonLabel: (closeReason: string) => string;
export {};
