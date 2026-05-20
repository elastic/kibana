import type { Observable } from 'rxjs';
import type { IKibanaSearchRequest } from '@kbn/search-types';
import type { ParsedDataSearchResponseDescriptor } from './types';
export declare const useDataSearchResponseState: <Request extends IKibanaSearchRequest, Response, InitialResponse>(response$: Observable<ParsedDataSearchResponseDescriptor<Request, Response | InitialResponse>>) => {
    cancelRequest: () => void;
    isRequestRunning: boolean;
    isResponsePartial: boolean;
    latestResponseData: Response | InitialResponse | undefined;
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
