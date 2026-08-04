export declare const requestDocumentationSchema: {
    type: "object";
    properties: {
        commands: {
            type: "array";
            items: {
                type: "string";
            };
            description: string;
        };
        functions: {
            type: "array";
            items: {
                type: "string";
            };
            description: string;
        };
    };
};
