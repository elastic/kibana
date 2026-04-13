import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { PackageClient } from '@kbn/fleet-plugin/server';
import type { Dashboard } from '../../../common/api_types';
export declare function getIntegrationDashboards(packageClient: PackageClient, savedObjectsClient: SavedObjectsClientContract, integration: string): Promise<Dashboard[]>;
