import type { LoggerFactory } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
export interface MessageSigningServiceInterface {
    get isEncryptionAvailable(): boolean;
    generateKeyPair(providedPassphrase?: string): Promise<{
        privateKey: string;
        publicKey: string;
        passphrase: string;
    }>;
    rotateKeyPair(): Promise<void>;
    sign(message: Buffer | Record<string, unknown>): Promise<{
        data: Buffer;
        signature: string;
    }>;
    getPublicKey(): Promise<string>;
}
export declare class MessageSigningService implements MessageSigningServiceInterface {
    private esoClient;
    private _soClient;
    private logger;
    constructor(loggerFactory: LoggerFactory, esoClient: EncryptedSavedObjectsClient);
    get isEncryptionAvailable(): MessageSigningServiceInterface['isEncryptionAvailable'];
    generateKeyPair(providedPassphrase?: string): ReturnType<MessageSigningServiceInterface['generateKeyPair']>;
    sign(message: Buffer | Record<string, unknown>): ReturnType<MessageSigningServiceInterface['sign']>;
    getPublicKey(): ReturnType<MessageSigningServiceInterface['getPublicKey']>;
    rotateKeyPair(): ReturnType<MessageSigningServiceInterface['rotateKeyPair']>;
    private removeKeyPair;
    private get soClient();
    private getCurrentKeyPairObjWithRetry;
    private getCurrentKeyPairObj;
    private checkForExistingKeyPair;
    private generatePassphrase;
}
