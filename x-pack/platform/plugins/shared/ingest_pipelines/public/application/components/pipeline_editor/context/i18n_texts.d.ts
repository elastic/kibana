export declare const pipelineEditorContextI18nTexts: {
    destinationScope: {
        processors: string;
        failureProcessors: string;
        failureHandlers: string;
    };
    moveBefore: ({ targetProcessor }: {
        targetProcessor: string;
    }) => string;
    moveAfter: ({ targetProcessor }: {
        targetProcessor: string;
    }) => string;
    moveToStartWithScope: ({ scopeLabel }: {
        scopeLabel: string;
    }) => string;
    moveToStartEmptyWithScope: ({ scopeLabel }: {
        scopeLabel: string;
    }) => string;
    moveToEnd: () => string;
    moveToNewPosition: () => string;
    moveSuccessWithScopeChange: ({ processorType, sourceScope, destinationScope, destinationDescription, }: {
        processorType: string;
        sourceScope: string;
        destinationScope: string;
        destinationDescription: string;
    }) => string;
    moveSuccess: ({ processorType, destinationDescription, }: {
        processorType: string;
        destinationDescription: string;
    }) => string;
};
