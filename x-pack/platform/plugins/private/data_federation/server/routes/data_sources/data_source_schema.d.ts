/**
 * Request body for `PUT .../data_sources/{id}`: {@link DataSourceWithSecrets} without
 * top-level `id` (the path supplies the id).
 */
export declare const putDataSourceBodySchema: import("@kbn/config-schema").Type<Readonly<{} & {
    type: "s3";
    description: string;
    settings: Readonly<{
        region?: string | undefined;
        endpoint?: string | undefined;
        addressing_style?: string | undefined;
        auth?: string | undefined;
        access_key?: string | null | undefined;
        secret_key?: string | null | undefined;
        role_arn?: string | undefined;
        jwt_audience?: string | undefined;
        role_session_name?: string | undefined;
        sts_endpoint?: string | undefined;
        sts_region?: string | undefined;
    } & {}>;
}> | Readonly<{} & {
    type: "gcs";
    description: string;
    settings: Readonly<{
        project_id?: string | undefined;
        endpoint?: string | undefined;
        token_uri?: string | undefined;
        auth?: string | undefined;
        credentials?: string | null | undefined;
        jwt_audience?: string | undefined;
        sts_audience?: string | undefined;
        service_account_impersonation_url?: string | undefined;
    } & {}>;
}> | Readonly<{} & {
    type: "azure";
    description: string;
    settings: Readonly<{
        endpoint?: string | undefined;
        account?: string | undefined;
        auth?: string | undefined;
        connection_string?: string | null | undefined;
        key?: string | null | undefined;
        sas_token?: string | null | undefined;
        tenant_id?: string | undefined;
        client_id?: string | undefined;
        jwt_audience?: string | undefined;
    } & {}>;
}>>;
