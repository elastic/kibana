import { type DoneNotification } from '@kbn/shared-ux-file-upload';
import { type PasteUploadState, type Action } from './types';
export declare function useUploadComplete(state: PasteUploadState, replacePlaceholder: (file: DoneNotification, placeholder: string) => void, dispatch: React.Dispatch<Action>): void;
