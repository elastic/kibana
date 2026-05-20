import type { CloudFormationProps } from '../../agent_enrollment_flyout/types';
export declare const useCreateCloudFormationUrl: ({ enrollmentAPIKey, cloudFormationProps, fleetServerHost, }: {
    enrollmentAPIKey?: string;
    cloudFormationProps?: CloudFormationProps;
    fleetServerHost?: string;
}) => {
    cloudFormationUrl: string | undefined;
    isError: boolean;
    error: string | undefined;
};
