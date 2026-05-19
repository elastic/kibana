export interface ReadySignal<T = void> {
    wait(): Promise<T>;
    signal(value: T): void;
    isEmitted(): boolean;
}
export declare function createReadySignal<T>(): ReadySignal<T>;
