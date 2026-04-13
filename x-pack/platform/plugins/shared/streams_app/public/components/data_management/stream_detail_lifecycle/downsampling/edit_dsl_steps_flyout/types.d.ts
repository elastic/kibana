import type { IngestStreamLifecycleDSL } from '@kbn/streams-schema';
export interface EditDslStepsFlyoutProps {
    initialSteps: IngestStreamLifecycleDSL;
    selectedStepIndex: number | undefined;
    setSelectedStepIndex: (index: number | undefined) => void;
    onChange: (next: IngestStreamLifecycleDSL) => void;
    onSave: (next: IngestStreamLifecycleDSL) => void;
    onClose: () => void;
    onChangeDebounceMs?: number;
    isSaving?: boolean;
    'data-test-subj'?: string;
}
