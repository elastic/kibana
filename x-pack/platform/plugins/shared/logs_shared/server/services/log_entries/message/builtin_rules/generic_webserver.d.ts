export declare const genericWebserverRules: {
    when: {
        exists: string[];
    };
    format: ({
        constant: string;
        field?: undefined;
    } | {
        field: string;
        constant?: undefined;
    })[];
}[];
