export type SimulationErrors = ReturnType<typeof useSimulationErrors>['errors'];
export declare const useSimulationErrors: () => {
    errors: {
        ignoredFields: string[];
        mappingFailures: string[];
        definition_error: import("@kbn/streams-schema").SimulationError | undefined;
    };
};
