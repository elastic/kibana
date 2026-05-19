import type { TypeOf } from '@kbn/config-schema';
import type { GetFileRequestSchema, FleetRequestHandler } from '../../types';
export declare const getFileHandler: FleetRequestHandler<TypeOf<typeof GetFileRequestSchema.params>>;
