import { Observable } from 'rxjs';
export declare function streamIntoObservable(readable: NodeJS.AsyncIterator<string>): Observable<any>;
