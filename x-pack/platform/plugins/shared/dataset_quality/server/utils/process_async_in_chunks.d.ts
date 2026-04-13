type CallbackFn<TResult> = (chunk: string[], id: number) => Promise<TResult>;
/**
 * This process takes a list of strings (for this use case, we'll pass it a list of data streams), and does the following steps:
 * 1. Create chunks from the original list. Each chunk will contain as many items until their summed length hits the limit.
 * 2. Provide each chunk in parallel to the chunkExecutor callback and resolve the result, which for our use case performs HTTP requests for data stream stats.
 * 3. Deep merge the result of each response into the same data structure, which is defined by the first item in the list.
 * 4. Once all chunks are processed, return the merged result.
 */
export declare const processAsyncInChunks: <TResult>(list: string[], chunkExecutor: CallbackFn<TResult>) => Promise<TResult>;
export {};
