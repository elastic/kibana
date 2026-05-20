import type { PackagePolicy } from '../../../../common';
export declare const useCreateCloudShellUrl: ({ enrollmentAPIKey, packagePolicy, }: {
    enrollmentAPIKey: string | undefined;
    packagePolicy?: PackagePolicy;
}) => {
    isLoading: boolean;
    cloudShellUrl: string;
    isError: boolean;
    error: string | undefined;
};
