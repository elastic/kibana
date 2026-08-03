import { type FC } from 'react';
import type { TagAttributes } from '../../../common/types';
import { type TagValidation } from '../../../common';
interface CreateOrEditModalProps {
    onClose: () => void;
    onSubmit: () => Promise<void>;
    onNameChange: (name: string, options?: {
        debounced?: boolean;
        hasBeenModified?: boolean;
    }) => Promise<void>;
    mode: 'create' | 'edit';
    tag: TagAttributes;
    validation: TagValidation;
    isValidating: boolean;
    setField: <T extends keyof TagAttributes>(field: T) => (value: TagAttributes[T]) => void;
}
export declare const CreateOrEditModal: FC<CreateOrEditModalProps>;
export {};
