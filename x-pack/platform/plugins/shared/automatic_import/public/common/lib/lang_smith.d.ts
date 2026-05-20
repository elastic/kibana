export interface LangSmithOptions {
    projectName: string;
    apiKey: string;
}
/**
 * Retrieves the LangSmith options from the AI Settings.
 */
export declare const getLangSmithOptions: (nameSpace?: string) => LangSmithOptions | undefined;
