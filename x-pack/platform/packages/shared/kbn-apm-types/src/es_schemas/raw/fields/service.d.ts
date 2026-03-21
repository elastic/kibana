export interface Service {
    name: string;
    environment?: string;
    framework?: {
        name?: string;
        version?: string;
    };
    node?: {
        name?: string;
    };
    runtime?: {
        name?: string;
        version?: string;
    };
    language?: {
        name?: string;
        version?: string;
    };
    version?: string;
}
