import type { ISearchSource } from '@kbn/data-plugin/common';
import type { ClientConfigType } from '@kbn/reporting-public';
export declare const getScrollApiTextForConsole: (jobTitle: string, indexPattern: string, searchSource: ISearchSource, csvConfig: ClientConfigType["csv"]) => string;
