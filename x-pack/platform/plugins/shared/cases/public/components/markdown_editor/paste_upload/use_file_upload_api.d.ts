import type { Dispatch } from 'react';
import type { UploadState } from '@kbn/shared-ux-file-upload/src/upload_state';
import { type PasteUploadState, type Action } from './types';
export declare function useFileUploadApi(uploadState: UploadState, uiState: PasteUploadState, dispatch: Dispatch<Action>): void;
