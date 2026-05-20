import type { AzureArmTemplateProps } from '../../agent_enrollment_flyout/types';
export declare const useCreateAzureArmTemplateUrl: ({ enrollmentAPIKey, azureArmTemplateProps, }: {
    enrollmentAPIKey: string | undefined;
    azureArmTemplateProps: AzureArmTemplateProps | undefined;
}) => {
    isLoading: boolean;
    azureArmTemplateUrl: string | undefined;
    isError: boolean;
    error: string | undefined;
};
