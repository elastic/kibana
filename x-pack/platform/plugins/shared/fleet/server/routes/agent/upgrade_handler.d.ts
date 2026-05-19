import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import type { PostAgentUpgradeRequestSchema, PostBulkAgentUpgradeRequestSchema } from '../../types';
export declare const postAgentUpgradeHandler: RequestHandler<TypeOf<typeof PostAgentUpgradeRequestSchema.params>, undefined, TypeOf<typeof PostAgentUpgradeRequestSchema.body>>;
export declare const postBulkAgentsUpgradeHandler: RequestHandler<undefined, undefined, TypeOf<typeof PostBulkAgentUpgradeRequestSchema.body>>;
export declare const checkKibanaVersion: (version: string, kibanaVersion: string, force?: boolean) => void;
