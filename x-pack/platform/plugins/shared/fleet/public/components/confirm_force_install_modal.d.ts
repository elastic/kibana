import type { DocLinksStart } from '@kbn/core/public';
import React from 'react';
import type { PackageInfo } from '../../common';
export declare const ConfirmForceInstallModal: React.FC<{
    onCancel: () => void;
    onConfirm: () => void;
    pkg?: Pick<PackageInfo, 'name' | 'version'>;
    docLinks: DocLinksStart;
}>;
