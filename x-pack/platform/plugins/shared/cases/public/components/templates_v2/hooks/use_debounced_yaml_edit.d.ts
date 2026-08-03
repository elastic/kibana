export declare const useDebouncedYamlEdit: (storageKey: string, initialValue: string, onChangeCallback: (value: string) => void, templateId?: string) => {
    value: string;
    onChange: (newValue: string) => void;
    handleReset: () => void;
    clearDraft: (savedValue?: string) => void;
    isSaving: boolean;
    isSaved: boolean;
};
