import React from 'react';
import type { CasesProps } from '../../components/app';
import type { CasesContextProps } from '../../components/cases_context';
type GetCasesPropsInternal = CasesProps & CasesContextProps;
export type GetCasesProps = Omit<GetCasesPropsInternal, 'externalReferenceAttachmentTypeRegistry' | 'persistableStateAttachmentTypeRegistry' | 'unifiedAttachmentTypeRegistry' | 'getFilesClient'>;
export declare const getCasesLazy: ({ externalReferenceAttachmentTypeRegistry, persistableStateAttachmentTypeRegistry, unifiedAttachmentTypeRegistry, getFilesClient, owner, permissions, basePath, actionsNavigation, refreshRef, timelineIntegration, features, releasePhase, }: GetCasesPropsInternal) => React.JSX.Element;
export {};
