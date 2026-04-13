import type { Item } from '../components/dataset_quality/filters/selector';
export declare const useQualityIssuesFilters: () => {
    showCurrentQualityIssues: boolean;
    toggleCurrentQualityIssues: () => void;
    issueTypeItems: Item[];
    onIssueTypesChange: (newIssueTypeItems: Item[]) => void;
    fieldItems: Item[];
    onFieldsChange: (newFieldItems: Item[]) => void;
};
