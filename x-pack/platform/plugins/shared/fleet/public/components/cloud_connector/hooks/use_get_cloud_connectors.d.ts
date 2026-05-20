import type { CloudConnector, CloudProvider, AccountType } from '../../../types';
export interface CloudConnectorQueryFilterOptions {
    cloudProvider?: CloudProvider;
    accountType?: AccountType;
    /** Package name of the current integration (e.g. 'cloud_security_posture') */
    packageName?: string;
    /** Policy template of the current integration (e.g. 'cspm', 'asset_inventory') */
    policyTemplate?: string;
}
export declare const useGetCloudConnectors: (filterOptions?: CloudConnectorQueryFilterOptions) => import("@kbn/react-query").UseQueryResult<CloudConnector[], unknown>;
