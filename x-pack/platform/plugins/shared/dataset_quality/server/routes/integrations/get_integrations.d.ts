import type { Logger } from '@kbn/core/server';
import type { PackageClient } from '@kbn/fleet-plugin/server';
import type { IntegrationType } from '../../../common/api_types';
export declare function getIntegration({ packageClient, logger, packageName, }: {
    packageClient: PackageClient;
    logger: Logger;
    packageName: string;
}): Promise<IntegrationType>;
export declare function getIntegrations(options: {
    packageClient: PackageClient;
    logger: Logger;
}): Promise<IntegrationType[]>;
