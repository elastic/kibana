export type FleetErrorType = 'verification_failed';
export interface FleetErrorResponse {
    message: string;
    statusCode: number;
    attributes?: {
        type?: FleetErrorType;
    };
}
