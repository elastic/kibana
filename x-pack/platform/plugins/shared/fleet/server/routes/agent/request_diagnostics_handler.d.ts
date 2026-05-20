import type { TypeOf } from '@kbn/config-schema';
import type { FleetRequestHandler, PostBulkRequestDiagnosticsActionRequestSchema, PostRequestDiagnosticsActionRequestSchema } from '../../types';
export declare const requestDiagnosticsHandler: FleetRequestHandler<TypeOf<typeof PostRequestDiagnosticsActionRequestSchema.params>, undefined, TypeOf<typeof PostRequestDiagnosticsActionRequestSchema.body>>;
export declare const bulkRequestDiagnosticsHandler: FleetRequestHandler<undefined, undefined, TypeOf<typeof PostBulkRequestDiagnosticsActionRequestSchema.body>>;
