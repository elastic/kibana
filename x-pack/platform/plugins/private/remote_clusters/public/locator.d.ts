import type { SerializableRecord } from '@kbn/utility-types';
import type { ManagementAppLocator } from '@kbn/management-plugin/common';
import type { LocatorDefinition } from '@kbn/share-plugin/public';
export declare const REMOTE_CLUSTERS_LOCATOR_ID = "REMOTE_CLUSTERS_LOCATOR";
export interface RemoteClustersLocatorParams extends SerializableRecord {
    page: 'remoteClusters';
}
export interface RemoteClustersLocatorDefinitionDependencies {
    managementAppLocator: ManagementAppLocator;
}
export declare class RemoteClustersLocatorDefinition implements LocatorDefinition<RemoteClustersLocatorParams> {
    protected readonly deps: RemoteClustersLocatorDefinitionDependencies;
    constructor(deps: RemoteClustersLocatorDefinitionDependencies);
    readonly id = "REMOTE_CLUSTERS_LOCATOR";
    readonly getLocation: (params: RemoteClustersLocatorParams) => Promise<{
        path: string;
        app: string;
        state: object;
    }>;
}
