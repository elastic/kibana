import type { TypeOf } from '@kbn/config-schema';
import type { startOAuthFlowPathParamsSchema, startOAuthFlowRequestBodySchema, disconnectOAuthPathParamsSchema } from '../schemas/v1';
export type StartOAuthFlowRequestBody = TypeOf<typeof startOAuthFlowRequestBodySchema>;
export type StartOAuthFlowPathParams = TypeOf<typeof startOAuthFlowPathParamsSchema>;
export interface StartOAuthFlowResponse {
    authorizationUrl: string;
}
export type DisconnectOAuthPathParams = TypeOf<typeof disconnectOAuthPathParamsSchema>;
