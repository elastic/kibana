import React from 'react';
import type { FileJSON } from '@kbn/shared-ux-file-types';
interface FilePreviewProps {
    closePreview: () => void;
    selectedFile: Pick<FileJSON, 'id' | 'name'>;
}
export declare const FilePreview: {
    ({ closePreview, selectedFile }: FilePreviewProps): React.JSX.Element;
    displayName: string;
};
export {};
