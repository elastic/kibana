import descriptionSystemPrompt from './system_prompt.text';
import overviewDescriptionSystemPrompt from './overview_system_prompt.text';
export { descriptionSystemPrompt as descriptionPrompt };
export { overviewDescriptionSystemPrompt as overviewDescriptionPrompt };
export declare function createGenerateStreamDescriptionPrompt({ systemPrompt }: {
    systemPrompt: string;
}): import("@kbn/inference-common").Prompt<{
    name: string;
    dataset_analysis: string;
}, [{
    system: {
        mustache: {
            template: string;
        };
    };
    template: {
        mustache: {
            template: any;
        };
    };
}]>;
