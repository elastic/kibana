import { TutorialsCategory } from '@kbn/home-plugin/server';
export declare function emsBoundariesSpecProvider({ emsLandingPageUrl, prependBasePath, }: {
    emsLandingPageUrl: string;
    prependBasePath: (path: string) => string;
}): () => {
    id: string;
    name: string;
    category: TutorialsCategory;
    shortDescription: string;
    longDescription: string;
    euiIconType: string;
    completionTimeMinutes: number;
    previewImagePath: string;
    onPrem: {
        instructionSets: {
            instructionVariants: {
                id: string;
                instructions: {
                    title: string;
                    textPre: string;
                }[];
            }[];
        }[];
    };
    elasticCloud: {
        instructionSets: {
            instructionVariants: {
                id: string;
                instructions: {
                    title: string;
                    textPre: string;
                }[];
            }[];
        }[];
    };
    integrationBrowserCategories: string[];
};
