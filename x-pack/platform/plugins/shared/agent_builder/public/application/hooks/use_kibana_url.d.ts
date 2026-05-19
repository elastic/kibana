import type { HttpSetup } from '@kbn/core/public';
export declare const useKibanaUrl: () => {
    kibanaUrl: string;
};
export declare function getFallbackKibanaUrl(http: HttpSetup): string;
