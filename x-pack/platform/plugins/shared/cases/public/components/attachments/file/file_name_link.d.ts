import React from 'react';
import type { FileJSON } from '@kbn/shared-ux-file-types';
interface FileNameLinkProps {
    file: Pick<FileJSON, 'name' | 'extension' | 'mimeType'>;
    showPreview: () => void;
}
export declare const FileNameLink: React.NamedExoticComponent<FileNameLinkProps>;
export {};
