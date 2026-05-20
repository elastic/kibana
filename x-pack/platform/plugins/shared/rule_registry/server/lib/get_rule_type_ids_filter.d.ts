export declare function getRuleTypeIdsFilter(ruleTypeIds?: string[]): {
    terms: {
        "kibana.alert.rule.rule_type_id": string[];
    };
} | undefined;
