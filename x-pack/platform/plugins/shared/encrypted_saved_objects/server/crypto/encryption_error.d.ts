/**
 * Defines operation (encryption or decryption) during which error occurred.
 */
export declare enum EncryptionErrorOperation {
    Encryption = 0,
    Decryption = 1
}
export declare class EncryptionError extends Error {
    readonly attributeName: string;
    readonly operation: EncryptionErrorOperation;
    readonly cause?: Error | undefined;
    constructor(message: string, attributeName: string, operation: EncryptionErrorOperation, cause?: Error | undefined);
    toJSON(): {
        message: string;
    };
}
