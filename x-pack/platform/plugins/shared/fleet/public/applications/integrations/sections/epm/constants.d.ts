import type { ServiceName, KibanaSavedObjectType } from '../../types';
import { ElasticsearchAssetType, KibanaAssetType } from '../../types';
type ServiceNameToAssetTypes = Record<Extract<ServiceName, 'kibana'>, KibanaAssetType[]> & Record<Extract<ServiceName, 'elasticsearch'>, ElasticsearchAssetType[]>;
export declare const DisplayedAssetsFromPackageInfo: ServiceNameToAssetTypes;
export declare const AssetTitleMap: Record<KibanaSavedObjectType | KibanaAssetType | ElasticsearchAssetType | 'view', string>;
export declare const ServiceTitleMap: Record<ServiceName, string>;
export {};
