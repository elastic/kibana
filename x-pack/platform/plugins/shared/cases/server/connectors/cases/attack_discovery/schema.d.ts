export declare const AttackDiscoveryExpandedAlertSchema: import("@kbn/config-schema").ObjectType<{
    _id: import("@kbn/config-schema").Type<string>;
    _index: import("@kbn/config-schema").Type<string>;
    kibana: import("@kbn/config-schema").ObjectType<{
        alert: import("@kbn/config-schema").ObjectType<{
            attack_discovery: import("@kbn/config-schema").ObjectType<{
                alert_ids: import("@kbn/config-schema").Type<string[]>;
                details_markdown: import("@kbn/config-schema").Type<string>;
                entity_summary_markdown: import("@kbn/config-schema").Type<string | undefined>;
                mitre_attack_tactics: import("@kbn/config-schema").Type<string[] | undefined>;
                replacements: import("@kbn/config-schema").Type<Readonly<{} & {
                    value: string;
                    uuid: string;
                }>[] | undefined>;
                summary_markdown: import("@kbn/config-schema").Type<string>;
                title: import("@kbn/config-schema").Type<string>;
            }>;
            rule: import("@kbn/config-schema").ObjectType<{
                parameters: import("@kbn/config-schema").ObjectType<{
                    alertsIndexPattern: import("@kbn/config-schema").Type<string>;
                }>;
                rule_type_id: import("@kbn/config-schema").Type<string>;
            }>;
        }>;
    }>;
}>;
export declare const AttackDiscoveryExpandedAlertsSchema: import("@kbn/config-schema").Type<Readonly<{} & {
    kibana: Readonly<{} & {
        alert: Readonly<{} & {
            rule: Readonly<{} & {
                parameters: Readonly<{} & {
                    alertsIndexPattern: string;
                }>;
                rule_type_id: string;
            }>;
            attack_discovery: Readonly<{
                replacements?: Readonly<{} & {
                    value: string;
                    uuid: string;
                }>[] | undefined;
                entity_summary_markdown?: string | undefined;
                mitre_attack_tactics?: string[] | undefined;
            } & {
                title: string;
                alert_ids: string[];
                details_markdown: string;
                summary_markdown: string;
            }>;
        }>;
    }>;
    _id: string;
    _index: string;
}>[]>;
