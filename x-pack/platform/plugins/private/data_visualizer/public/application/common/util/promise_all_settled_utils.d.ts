export declare const isFulfilled: <T>(input: PromiseSettledResult<Awaited<T>>) => input is PromiseFulfilledResult<Awaited<T>>;
export declare const isRejected: <T>(input: PromiseSettledResult<Awaited<T>>) => input is PromiseRejectedResult;
