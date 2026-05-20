import { type FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { type PasteUploadState, type Action } from './types';
export declare function useUploadStart(state: PasteUploadState, dispatch: React.Dispatch<Action>, textarea: HTMLTextAreaElement | null, field: FieldHook<string>): void;
