import type { KibanaRequest, KibanaResponseFactory, CustomRequestHandlerContext, IScopedClusterClient, RequestHandler, SavedObjectsClientContract, CoreSetup } from '@kbn/core/server';
import type { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import type { AlertingApiRequestHandlerContext } from '@kbn/alerting-plugin/server';
import type { PluginStart as DataViewsPluginStart } from '@kbn/data-views-plugin/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { MLSavedObjectService } from '../saved_objects';
import type { MlLicense } from '../../common/license';
import type { MlClient } from './ml_client';
import { MlAuditLogger } from './ml_client';
import type { ServerlessInfo } from '../types';
type MLRequestHandlerContext = CustomRequestHandlerContext<{
    alerting?: AlertingApiRequestHandlerContext;
}>;
type Handler<P = unknown, Q = unknown, B = unknown> = (handlerParams: {
    client: IScopedClusterClient;
    request: KibanaRequest<P, Q, B>;
    response: KibanaResponseFactory;
    context: MLRequestHandlerContext;
    mlSavedObjectService: MLSavedObjectService;
    mlClient: MlClient;
    getDataViewsService(): Promise<DataViewsService>;
    auditLogger: MlAuditLogger;
}) => ReturnType<RequestHandler<P, Q, B>>;
type GetMlSavedObjectClient = (request: KibanaRequest) => SavedObjectsClientContract | null;
type GetInternalSavedObjectClient = () => SavedObjectsClientContract | null;
type GetDataViews = () => DataViewsPluginStart | null;
export declare class RouteGuard {
    private _mlLicense;
    private _getMlSavedObjectClient;
    private _getInternalSavedObjectClient;
    private _spacesPlugin;
    private _authorization;
    private _isMlReady;
    private _getDataViews;
    private _getStartServices;
    private _serverless;
    constructor(mlLicense: MlLicense, getSavedObject: GetMlSavedObjectClient, getInternalSavedObject: GetInternalSavedObjectClient, spacesPlugin: SpacesPluginSetup | undefined, authorization: SecurityPluginSetup['authz'] | undefined, isMlReady: () => Promise<void>, getDataViews: GetDataViews, getStartServices: CoreSetup['getStartServices'], serverless: ServerlessInfo);
    fullLicenseAPIGuard<P, Q, B>(handler: Handler<P, Q, B>): (context: MLRequestHandlerContext, request: KibanaRequest<P, Q, B, any>, response: KibanaResponseFactory) => Promise<import("@kbn/core/server").IKibanaResponse<any>>;
    basicLicenseAPIGuard<P, Q, B>(handler: Handler<P, Q, B>): (context: MLRequestHandlerContext, request: KibanaRequest<P, Q, B, any>, response: KibanaResponseFactory) => Promise<import("@kbn/core/server").IKibanaResponse<any>>;
    private _guard;
}
export {};
