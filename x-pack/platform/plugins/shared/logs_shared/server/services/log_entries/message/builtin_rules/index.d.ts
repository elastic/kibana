export declare const getBuiltinRules: (genericMessageFields: string[]) => (import("../rule_types").LogMessageFormattingRule | {
    when: {
        values: {
            'event.dataset': string;
        };
        exists?: undefined;
    };
    format: ({
        constant: string;
        field?: undefined;
    } | {
        field: string;
        constant?: undefined;
    })[];
})[];
