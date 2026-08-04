export declare function getRouteConfig(): {
    basePath: string;
    routeVersion: string;
    routeConfig: {
        readonly access: "public";
        readonly options: {
            readonly tags: readonly ["oas-tag:Tags"];
            readonly availability: {
                readonly since: "9.5.0";
                readonly stability: "experimental";
            };
        };
        readonly security: {
            readonly authz: {
                readonly enabled: false;
                readonly reason: "Relies on the Saved Objects client for authorization";
            };
        };
    };
};
