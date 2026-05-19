import type { TypeOf } from '@kbn/config-schema';
import type { FleetRequestHandler, PostGenerateAgentsReportRequestSchema } from '../../types';
export declare const generateReportHandler: FleetRequestHandler<Record<string, string>, null, TypeOf<typeof PostGenerateAgentsReportRequestSchema.body>>;
export declare const getSortFieldForAPI: (field: string) => string;
