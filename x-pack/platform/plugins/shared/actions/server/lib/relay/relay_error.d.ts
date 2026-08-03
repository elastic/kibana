export declare class RelayRequestError extends Error {
    readonly statusCode: number;
    readonly relayMessage?: string | undefined;
    constructor(path: string, statusCode: number, relayMessage?: string | undefined);
    get isTerminal(): boolean;
}
