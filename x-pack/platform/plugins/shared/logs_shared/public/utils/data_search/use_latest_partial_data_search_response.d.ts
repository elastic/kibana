import type { Observable } from 'rxjs';
import type { IKibanaSearchRequest } from '@kbn/search-types';
import type { ParsedDataSearchRequestDescriptor } from './types';
export declare const useLatestPartialDataSearchResponse: <Request extends IKibanaSearchRequest, Response>(requests$: Observable<ParsedDataSearchRequestDescriptor<Request, Response>>) => {
    cancelRequest: () => void;
    isRequestRunning: boolean;
    isResponsePartial: boolean;
    latestResponseData: Response | undefined;
    latestResponseErrors: ({
        type: "aborted";
    } | {
        type: "generic";
        message: string;
    } | {
        type: "shardFailure";
        shardInfo: {
            shard: number | null;
            index: string | null;
            node: string | null;
        };
        message: string | null;
    })[] | undefined;
    loaded: number | undefined;
    total: number | undefined;
};
