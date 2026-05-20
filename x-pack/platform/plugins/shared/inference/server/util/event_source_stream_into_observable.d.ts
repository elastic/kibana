import type { Readable } from 'node:stream';
import type { Observable } from 'rxjs';
export declare function eventSourceStreamIntoObservable(readable: Readable): Observable<string>;
