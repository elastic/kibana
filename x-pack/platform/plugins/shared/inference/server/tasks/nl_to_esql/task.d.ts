import type { Observable } from 'rxjs';
import type { ToolOptions } from '@kbn/inference-common';
import type { NlToEsqlTaskParams, NlToEsqlTaskEvent } from './types';
export declare function naturalLanguageToEsql<TToolOptions extends ToolOptions>(options: NlToEsqlTaskParams<TToolOptions>): Observable<NlToEsqlTaskEvent<TToolOptions>>;
