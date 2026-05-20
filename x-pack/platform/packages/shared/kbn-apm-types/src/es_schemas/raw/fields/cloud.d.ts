export interface Cloud {
    availability_zone?: string;
    instance?: {
        name?: string;
        id?: string;
    };
    machine?: {
        type?: string;
    };
    project?: {
        id?: string;
        name?: string;
    };
    provider?: string;
    region?: string;
    account?: {
        id?: string;
        name?: string;
    };
    image?: {
        id?: string;
    };
    service?: {
        name?: string;
    };
}
