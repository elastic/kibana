export declare const useDebouncedYamlEdit: (storageKey: string, initialValue: string, onChangeCallback: (value: string) => void, templateId?: string) => {
    value: string;
    onChange: (newValue: string) => void;
    handleReset: () => void;
    isSaving: boolean;
    isSaved: boolean;
};
