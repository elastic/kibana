import type { TypeOf } from '@kbn/config-schema';
import type { FleetRequestHandler } from '../../types';
import type { CreateCloudConnectorRequestSchema, GetCloudConnectorRequestSchema, GetCloudConnectorsRequestSchema, UpdateCloudConnectorRequestSchema, DeleteCloudConnectorRequestSchema, GetCloudConnectorUsageRequestSchema } from '../../types/rest_spec/cloud_connector';
export declare const createCloudConnectorHandler: FleetRequestHandler<undefined, undefined, TypeOf<typeof CreateCloudConnectorRequestSchema.body>>;
export declare const getCloudConnectorsHandler: FleetRequestHandler<undefined, TypeOf<typeof GetCloudConnectorsRequestSchema.query>>;
export declare const getCloudConnectorHandler: FleetRequestHandler<TypeOf<typeof GetCloudConnectorRequestSchema.params>, undefined>;
export declare const updateCloudConnectorHandler: FleetRequestHandler<TypeOf<typeof UpdateCloudConnectorRequestSchema.params>, undefined, TypeOf<typeof UpdateCloudConnectorRequestSchema.body>>;
export declare const deleteCloudConnectorHandler: FleetRequestHandler<TypeOf<typeof DeleteCloudConnectorRequestSchema.params>, TypeOf<typeof DeleteCloudConnectorRequestSchema.query>>;
export declare const getCloudConnectorUsageHandler: FleetRequestHandler<TypeOf<typeof GetCloudConnectorUsageRequestSchema.params>, TypeOf<typeof GetCloudConnectorUsageRequestSchema.query>>;
