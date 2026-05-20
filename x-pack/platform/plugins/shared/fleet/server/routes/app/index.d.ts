import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import type { ExperimentalFeatures } from '../../../common/experimental_features';
import type { FleetAuthzRouter } from '../../services/security';
import type { FleetRequestHandler } from '../../types';
import { CheckPermissionsRequestSchema } from '../../types';
export declare const getCheckPermissionsHandler: FleetRequestHandler<unknown, TypeOf<typeof CheckPermissionsRequestSchema.query>>;
export declare const postEnableSpaceAwarenessHandler: FleetRequestHandler;
export declare const generateServiceTokenHandler: RequestHandler<null, null, TypeOf<typeof GenerateServiceTokenRequestSchema.body>>;
export declare const getAgentPoliciesSpacesHandler: FleetRequestHandler<null, null, TypeOf<typeof GenerateServiceTokenRequestSchema.body>>;
export declare const GenerateServiceTokenRequestSchema: {
    body: import("@kbn/config-schema").Type<Readonly<{} & {
        remote: boolean;
    }> | null>;
};
export declare const GenerateServiceTokenResponseSchema: import("@kbn/config-schema").ObjectType<{
    name: import("@kbn/config-schema").Type<string>;
    value: import("@kbn/config-schema").Type<string>;
}>;
export declare const registerRoutes: (router: FleetAuthzRouter, experimentalFeatures: ExperimentalFeatures) => void;
