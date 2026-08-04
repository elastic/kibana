import type { FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
export interface AddCommentFormSchema {
    comment: string;
}
export declare const schema: FormSchema<AddCommentFormSchema>;
