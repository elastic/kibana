import type { Dispatch, FC, PropsWithChildren } from 'react';
import React from 'react';
import type { ScopedFilesClient } from '@kbn/files-plugin/public';
import type { QueryClient } from '@kbn/react-query';
import type { CasesFeaturesAllRequired, CasesFeatures, CasesPermissions } from '../../containers/types';
import type { ReleasePhase } from '../types';
import type { ExternalReferenceAttachmentTypeRegistry } from '../../client/attachment_framework/external_reference_registry';
import type { PersistableStateAttachmentTypeRegistry } from '../../client/attachment_framework/persistable_state_registry';
import type { UnifiedAttachmentTypeRegistry } from '../../client/attachment_framework/unified_attachment_registry';
import type { CasesContextStoreAction } from './state/cases_context_reducer';
type CasesContextValueDispatch = Dispatch<CasesContextStoreAction>;
export interface CasesContextValue {
    externalReferenceAttachmentTypeRegistry: ExternalReferenceAttachmentTypeRegistry;
    persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
    unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry;
    owner: string[];
    permissions: CasesPermissions;
    basePath: string;
    features: CasesFeaturesAllRequired;
    releasePhase: ReleasePhase;
    dispatch: CasesContextValueDispatch;
}
export interface CasesContextProps extends Pick<CasesContextValue, 'owner' | 'permissions' | 'externalReferenceAttachmentTypeRegistry' | 'persistableStateAttachmentTypeRegistry' | 'unifiedAttachmentTypeRegistry'> {
    basePath?: string;
    features?: CasesFeatures;
    releasePhase?: ReleasePhase;
    getFilesClient: (scope: string) => ScopedFilesClient;
}
export declare const CasesContext: React.Context<CasesContextValue | undefined>;
export declare const CasesProvider: FC<PropsWithChildren<{
    value: CasesContextProps;
    queryClient?: QueryClient;
}>>;
export default CasesProvider;
