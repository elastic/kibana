export interface BackoffStrategy {
    nextBackOff: () => number;
}
export interface BackoffFactory {
    create: () => BackoffStrategy;
}
