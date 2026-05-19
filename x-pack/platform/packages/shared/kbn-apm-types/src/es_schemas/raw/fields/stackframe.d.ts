interface Line {
    column?: number;
    number: number;
}
interface Sourcemap {
    error?: string;
    updated?: boolean;
}
interface StackframeBase {
    abs_path?: string;
    classname?: string;
    context?: {
        post?: string[];
        pre?: string[];
    };
    exclude_from_grouping?: boolean;
    filename?: string;
    function?: string;
    module?: string;
    library_frame?: boolean;
    line?: Line;
    sourcemap?: Sourcemap;
    vars?: {
        [key: string]: unknown;
    };
}
export type StackframeWithLineContext = StackframeBase & {
    line: Line & {
        context: string;
    };
};
export type Stackframe = StackframeBase | StackframeWithLineContext;
export {};
