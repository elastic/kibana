export declare enum ImportStep {
    UploadYaml = 1,
    SelectTemplates = 2
}
interface UseImportStepsParams {
    isSelectEnabled: boolean;
}
export declare const useImportSteps: ({ isSelectEnabled }: UseImportStepsParams) => {
    currentStep: ImportStep;
    horizontalSteps: Omit<import("@elastic/eui/src/components/steps/step_horizontal").EuiStepHorizontalProps, "step">[];
    isFirstStep: boolean;
    isLastStep: boolean;
    goToStep: (step: ImportStep) => void;
};
export {};
