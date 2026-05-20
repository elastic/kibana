import type { HttpStart } from '@kbn/core/public';
export declare class IndicesAPIClient {
    private readonly http;
    private readonly fieldCache;
    constructor(http: HttpStart);
    getFields(pattern: string): Promise<string[]>;
}
