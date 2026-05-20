interface PollerOptions {
    functionToPoll: () => Promise<void>;
    pollFrequencyInMillis: number;
    trailing?: boolean;
    continuePollingOnError?: boolean;
    pollFrequencyErrorMultiplier?: number;
    successFunction?: (...args: unknown[]) => void;
    errorFunction?: (error: Error) => void;
}
export declare class Poller {
    private readonly functionToPoll;
    private readonly successFunction;
    private readonly errorFunction;
    private _isRunning;
    private _timeoutId;
    private pollFrequencyInMillis;
    private trailing;
    private continuePollingOnError;
    private pollFrequencyErrorMultiplier;
    constructor(options: PollerOptions);
    getPollFrequency(): number;
    _poll(): Promise<void>;
    start(): void;
    stop(): void;
    isRunning(): boolean;
}
export {};
