export declare function getConsumersFilter(consumers?: string[]): {
    terms: {
        "kibana.alert.rule.consumer": string[];
    };
} | undefined;
