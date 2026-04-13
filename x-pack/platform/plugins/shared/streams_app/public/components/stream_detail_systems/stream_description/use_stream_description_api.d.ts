import { Streams } from '@kbn/streams-schema';
export declare const useStreamDescriptionApi: ({ definition, refreshDefinition, silent, }: {
    definition: Streams.all.GetResponse;
    refreshDefinition: () => void;
    silent?: boolean;
}) => {
    description: string;
    setDescription: import("react").Dispatch<import("react").SetStateAction<string>>;
    isUpdating: boolean;
    isEditing: boolean;
    onCancelEdit: () => void;
    onStartEditing: () => void;
    onSaveDescription: (desc?: string) => void;
    isTaskLoading: boolean;
    task: import("../../../../../streams/server/routes/internal/streams/description_generation/route").DescriptionGenerationTaskResult | undefined;
    taskError: Error | undefined;
    refreshTask: () => Promise<import("../../../../../streams/server/routes/internal/streams/description_generation/route").DescriptionGenerationTaskResult>;
    getDescriptionGenerationStatus: () => Promise<import("../../../../../streams/server/routes/internal/streams/description_generation/route").DescriptionGenerationTaskResult>;
    scheduleDescriptionGenerationTask: (connectorId: string) => Promise<void>;
    cancelDescriptionGenerationTask: () => Promise<void>;
    acknowledgeDescriptionGenerationTask: () => Promise<void>;
    areButtonsDisabled: boolean;
};
