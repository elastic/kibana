import React from 'react';
import type { FileJSON } from '@kbn/shared-ux-file-types';
export declare const FileIcon: React.MemoExoticComponent<({ file }: {
    file: Pick<FileJSON<unknown>, "id" | "name" | "mimeType">;
}) => React.JSX.Element>;
