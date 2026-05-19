import type { Observable } from 'rxjs';
import type { AnalyticsClient } from '@elastic/ebt/client';
import type { ILicense } from '@kbn/licensing-types';
export declare function registerAnalyticsContextProvider(analytics: Pick<AnalyticsClient, 'registerContextProvider'>, license$: Observable<ILicense>): void;
