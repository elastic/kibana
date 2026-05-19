import { SyncStatus } from '../../../common/types';
export declare const RemoteSyncedIntegrationsStatusSchema: import("@kbn/config-schema").ObjectType<Omit<{
    id: import("@kbn/config-schema").Type<string | undefined>;
    package_name: import("@kbn/config-schema").Type<string | undefined>;
    package_version: import("@kbn/config-schema").Type<string | undefined>;
}, "error" | "warning" | "updated_at" | "install_status" | "sync_status"> & {
    error: import("@kbn/config-schema").Type<string | undefined>;
    warning: import("@kbn/config-schema").Type<Readonly<{
        message?: string | undefined;
    } & {
        title: string;
    }> | undefined>;
    updated_at: import("@kbn/config-schema").Type<string | undefined>;
    install_status: import("@kbn/config-schema").ObjectType<{
        main: import("@kbn/config-schema").Type<string>;
        remote: import("@kbn/config-schema").Type<string | undefined>;
    }>;
    sync_status: import("@kbn/config-schema").Type<SyncStatus>;
}>;
export declare const CustomAssetsDataSchema: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<string>;
    name: import("@kbn/config-schema").Type<string>;
    package_name: import("@kbn/config-schema").Type<string>;
    package_version: import("@kbn/config-schema").Type<string>;
    sync_status: import("@kbn/config-schema").Type<SyncStatus>;
    error: import("@kbn/config-schema").Type<string | undefined>;
    is_deleted: import("@kbn/config-schema").Type<boolean | undefined>;
    warning: import("@kbn/config-schema").Type<Readonly<{
        message?: string | undefined;
    } & {
        title: string;
    }> | undefined>;
}>;
export declare const GetRemoteSyncedIntegrationsStatusResponseSchema: import("@kbn/config-schema").ObjectType<{
    integrations: import("@kbn/config-schema").Type<Readonly<{
        id?: string | undefined;
        error?: string | undefined;
        package_version?: string | undefined;
        warning?: Readonly<{
            message?: string | undefined;
        } & {
            title: string;
        }> | undefined;
        updated_at?: string | undefined;
        package_name?: string | undefined;
    } & {
        install_status: Readonly<{
            remote?: string | undefined;
        } & {
            main: string;
        }>;
        sync_status: SyncStatus;
    }>[]>;
    custom_assets: import("@kbn/config-schema").Type<Record<string, Readonly<{
        error?: string | undefined;
        warning?: Readonly<{
            message?: string | undefined;
        } & {
            title: string;
        }> | undefined;
        is_deleted?: boolean | undefined;
    } & {
        name: string;
        package_version: string;
        type: string;
        package_name: string;
        sync_status: SyncStatus;
    }>> | undefined>;
    error: import("@kbn/config-schema").Type<string | undefined>;
    warning: import("@kbn/config-schema").Type<Readonly<{
        message?: string | undefined;
    } & {
        title: string;
    }> | undefined>;
}>;
