export interface UserAgent {
    device?: {
        name: string;
    };
    name?: string;
    original?: string;
    os?: {
        name: string;
        version?: string;
        full?: string;
    };
    version?: string;
}
