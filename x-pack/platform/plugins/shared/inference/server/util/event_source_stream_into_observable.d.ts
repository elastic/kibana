import type { Readable } from 'node:stream';
import { Observable } from 'rxjs';
export declare function eventSourceStreamIntoObservable(readable: Readable): Observable<string>;
