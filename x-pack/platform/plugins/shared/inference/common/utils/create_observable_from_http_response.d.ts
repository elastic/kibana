import { Observable } from 'rxjs';
export interface StreamedHttpResponse {
    response?: {
        body: ReadableStream<Uint8Array> | null | undefined;
    };
}
export declare function createObservableFromHttpResponse(response: StreamedHttpResponse): Observable<string>;
