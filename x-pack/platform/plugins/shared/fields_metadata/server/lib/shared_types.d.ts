import type { Logger } from '@kbn/logging';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { IRouter } from '@kbn/core-http-server';
import type { FieldsMetadataPluginStartServicesAccessor, FieldsMetadataServerPluginSetupDeps } from '../types';
export interface FieldsMetadataBackendLibs {
    getStartServices: FieldsMetadataPluginStartServicesAccessor;
    logger: Logger;
    plugins: FieldsMetadataServerPluginSetupDeps;
    router: IRouter<RequestHandlerContext>;
}
