export declare const queryKeys: {
    applicationConnections: {
        all: readonly ["applicationConnections"];
        clients: {
            all: readonly ["applicationConnections", "clients", "list"];
            byId: (clientId: string) => readonly ["applicationConnections", "clients", string];
        };
        connections: {
            all: readonly ["applicationConnections", "connections", "list"];
            byClient: (clientId: string) => readonly ["applicationConnections", "connections", {
                readonly clientId: string;
            }];
        };
    };
};
