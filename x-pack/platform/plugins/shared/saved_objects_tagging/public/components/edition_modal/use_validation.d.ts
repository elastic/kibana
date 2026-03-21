import { BehaviorSubject } from 'rxjs';
import type { ITagsClient, TagAttributes } from '../../../common/types';
import { type TagValidation } from '../../../common';
export declare const useValidation: ({ tagAttributes, tagClient, validateDuplicateNameOnMount, }: {
    tagAttributes: TagAttributes;
    tagClient: ITagsClient;
    validateDuplicateNameOnMount?: boolean;
}) => {
    validation: TagValidation;
    setValidation: import("react").Dispatch<import("react").SetStateAction<TagValidation>>;
    isValidating: boolean;
    validation$: BehaviorSubject<{
        isValidating: boolean;
        hasDuplicateNameError: boolean;
    }>;
    onNameChange: (name: string, { debounced, hasBeenModified, }?: {
        debounced?: boolean;
        hasBeenModified?: boolean;
    }) => Promise<void>;
};
