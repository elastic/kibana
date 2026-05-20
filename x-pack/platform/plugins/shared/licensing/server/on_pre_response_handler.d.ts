import type { OnPreResponseHandler } from '@kbn/core/server';
import type { ILicense } from '@kbn/licensing-types';
import type { Observable } from 'rxjs';
export declare function createOnPreResponseHandler(refresh: () => Promise<ILicense>, license$: Observable<ILicense>): OnPreResponseHandler;
