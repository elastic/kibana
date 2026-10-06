import type { IContextProvider, StartServicesAccessor } from '@kbn/core/server';
import type { Observable } from 'rxjs';
import type { ILicense } from '@kbn/licensing-types';
import type { LicensingPluginStart, LicensingRequestHandlerContext } from './types';
/**
 * Create a route handler context for access to Kibana license information.
 * @param license$ An observable of a License instance.
 * @public
 */
export declare function createRouteHandlerContext(license$: Observable<ILicense>, getStartServices: StartServicesAccessor<{}, LicensingPluginStart>): IContextProvider<LicensingRequestHandlerContext, 'licensing'>;
