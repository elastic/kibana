import React from 'react';
import type { FieldConfig } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
export declare const schema: {
    tags: FieldConfig<string[]>;
};
export interface EditTagsProps {
    isLoading: boolean;
    onSubmit: (a: string[]) => void;
    tags: string[];
}
export declare const EditTags: React.MemoExoticComponent<({ isLoading, onSubmit, tags }: EditTagsProps) => React.JSX.Element>;
