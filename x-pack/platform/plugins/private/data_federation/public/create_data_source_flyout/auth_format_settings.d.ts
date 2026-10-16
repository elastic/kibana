import type { AzureDataSourceWithSecrets, GCSDataSourceWithSecrets, S3DataSourceWithSecrets } from '../../common/datasource_types';
import type { AzureAuthenticationMode, GcsAuthenticationMode, S3AuthenticationMode } from './create_data_source_flyout_authentication';
export declare const authFormatSettingsByDataSourceType: {
    s3: Record<S3AuthenticationMode, (dataSourceWithSecrets: S3DataSourceWithSecrets) => Record<string, unknown>>;
    gcs: Record<GcsAuthenticationMode, (dataSourceWithSecrets: GCSDataSourceWithSecrets) => Record<string, unknown>>;
    azure: Record<AzureAuthenticationMode, (dataSourceWithSecrets: AzureDataSourceWithSecrets) => Record<string, unknown>>;
};
