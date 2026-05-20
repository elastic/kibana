import type { Observable } from 'rxjs';
import { type ServiceStatus } from '@kbn/core/server';
import type { ILicense } from '@kbn/licensing-types';
export declare const getPluginStatus$: (license$: Observable<ILicense>, stop$: Observable<void>) => Observable<ServiceStatus>;
