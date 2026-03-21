export interface Kubernetes {
    pod?: {
        uid?: string | null;
        name?: string;
    };
    namespace?: string;
    replicaset?: {
        name?: string;
    };
    deployment?: {
        name?: string;
    };
    container?: {
        id?: string;
        name?: string;
    };
}
