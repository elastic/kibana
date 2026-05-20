import { type SupportedPath } from '../../../../common/api_schemas/json_schema_schema';
import type { HttpService } from '../http_service';
export interface GetSchemaDefinitionParams {
    path: SupportedPath;
    method: string;
}
export declare function jsonSchemaProvider(httpService: HttpService): {
    getSchemaDefinition(params: GetSchemaDefinitionParams): Promise<object>;
};
