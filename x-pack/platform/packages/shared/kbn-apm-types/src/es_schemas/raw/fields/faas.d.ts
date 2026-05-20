export interface Faas {
    id: string;
    coldstart?: boolean;
    execution?: string;
    trigger?: {
        type?: string;
        request_id?: string;
    };
}
