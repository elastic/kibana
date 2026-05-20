export declare const ROUTES: {
    list: string;
    edit: string;
    create: string;
    clone: string;
    createFromCsv: string;
    manageProcessors: string;
};
export declare const getListPath: ({ inspectedPipelineName, }?: {
    inspectedPipelineName?: string;
}) => string;
export declare const getEditPath: ({ pipelineName }: {
    pipelineName: string;
}) => string;
export declare const getCreatePath: ({ pipelineName }?: {
    pipelineName?: string;
}) => string;
export declare const getClonePath: ({ clonedPipelineName }: {
    clonedPipelineName: string;
}) => string;
export declare const getCreateFromCsvPath: () => string;
export declare const getManageProcessorsPath: () => string;
