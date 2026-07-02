import type { IClusterClient, Logger } from '@kbn/core/server';
import type { PrivilegesService } from '@kbn/security-authorization-core';
export declare function registerPrivilegesWithCluster(logger: Logger, privileges: PrivilegesService, application: string, clusterClient: IClusterClient): Promise<void>;
