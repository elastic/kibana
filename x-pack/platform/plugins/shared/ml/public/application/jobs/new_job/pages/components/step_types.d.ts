export declare enum WIZARD_STEPS {
    TIME_RANGE = 0,
    ADVANCED_CONFIGURE_DATAFEED = 1,
    PICK_FIELDS = 2,
    JOB_DETAILS = 3,
    VALIDATION = 4,
    SUMMARY = 5
}
export interface StepProps {
    isCurrentStep: boolean;
    setCurrentStep: React.Dispatch<React.SetStateAction<WIZARD_STEPS>>;
}
