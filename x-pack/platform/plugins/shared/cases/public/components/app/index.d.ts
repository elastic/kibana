import React from 'react';
import type { ScopedFilesClient } from '@kbn/files-plugin/public';
import type { ExternalReferenceAttachmentTypeRegistry } from '../../client/attachment_framework/external_reference_registry';
import type { PersistableStateAttachmentTypeRegistry } from '../../client/attachment_framework/persistable_state_registry';
import type { UnifiedAttachmentTypeRegistry } from '../../client/attachment_framework/unified_attachment_registry';
import type { CasesRoutesProps } from './types';
export type CasesProps = CasesRoutesProps;
interface CasesAppProps {
    externalReferenceAttachmentTypeRegistry: ExternalReferenceAttachmentTypeRegistry;
    persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
    unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry;
    getFilesClient: (scope: string) => ScopedFilesClient;
}
export declare const CasesApp: React.NamedExoticComponent<CasesAppProps>;
export {};
