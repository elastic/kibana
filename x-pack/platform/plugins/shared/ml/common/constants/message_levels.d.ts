export declare const MESSAGE_LEVEL: {
    readonly ERROR: "error";
    readonly INFO: "info";
    readonly SUCCESS: "success";
    readonly WARNING: "warning";
};
export type MessageLevel = (typeof MESSAGE_LEVEL)[keyof typeof MESSAGE_LEVEL];
