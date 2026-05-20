export declare const TELEMETRY_MAX_QUEUE_SIZE = 100;
export declare class TelemetryQueue<T> {
    private maxQueueSize;
    private queue;
    addEvents(events: T[]): void;
    clearEvents(): void;
    getEvents(): T[];
}
