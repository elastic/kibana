import type { DocLinksStart } from '@kbn/core/public';
import React from 'react';
export declare const ConfirmOpenUnverifiedModal: React.FC<{
    onCancel: () => void;
    onConfirm: () => void;
    pkgName: string;
    docLinks: DocLinksStart;
}>;
