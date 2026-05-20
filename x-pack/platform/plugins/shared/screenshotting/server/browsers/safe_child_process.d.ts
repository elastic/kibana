import type { Observable } from 'rxjs';
import type { Logger } from '@kbn/core/server';
interface IChild {
    kill(signal: string): Promise<unknown>;
}
export declare function safeChildProcess(logger: Logger, childProcess: IChild): {
    terminate$: Observable<string>;
};
export {};
