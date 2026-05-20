import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { TraceFetcher } from './use_trace_spans';
export declare const createEsTraceFetcher: (search: DataPublicPluginStart["search"]["search"]) => TraceFetcher;
