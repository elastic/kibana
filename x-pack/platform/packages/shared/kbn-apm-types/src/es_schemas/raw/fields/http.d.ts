export interface Http {
    request?: {
        method?: string;
    };
    response?: {
        status_code?: number;
    };
    version?: string;
}
