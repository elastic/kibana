export declare class RuleDataWriteDisabledError extends Error {
    constructor({ reason, registrationContext, message, }: {
        reason: 'config' | 'error';
        registrationContext?: string;
        message?: string;
    });
}
export declare class RuleDataWriterInitializationError extends Error {
    constructor(resourceType: 'index' | 'namespace', registrationContext: string, error: string | Error);
}
