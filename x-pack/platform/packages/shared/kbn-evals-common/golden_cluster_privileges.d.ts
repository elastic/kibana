/**
 * Shared privilege descriptors for the golden cluster API key.
 *
 * Used by the CLI (`node scripts/evals init`) and the evals plugin
 * (remote Kibana configuration UI). Consumers override `name` and
 * `metadata` to suit their context.
 */
export declare const goldenClusterPrivileges: {
    readonly kibana_role_descriptors: {
        readonly 'kbn-evals-all': {
            readonly elasticsearch: {
                readonly cluster: readonly ["manage_index_templates"];
                readonly indices: readonly [{
                    readonly names: readonly ["kibana-evaluations*"];
                    readonly privileges: readonly ["auto_configure", "create_index", "create_doc", "read", "view_index_metadata"];
                }, {
                    readonly names: readonly ["traces-*"];
                    readonly privileges: readonly ["auto_configure", "create_index", "create_doc", "read", "view_index_metadata"];
                }, {
                    readonly names: readonly ["kibana-evaluation-dataset*"];
                    readonly privileges: readonly ["auto_configure", "create_index", "create_doc", "read", "view_index_metadata", "delete", "index"];
                }];
            };
            readonly kibana: readonly [{
                readonly base: readonly [];
                readonly spaces: readonly ["*"];
                readonly feature: {
                    readonly evals: readonly ["all"];
                };
            }];
        };
    };
};
