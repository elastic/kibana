export declare const filebeatTraefikRules: {
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
