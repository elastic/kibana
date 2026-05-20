import React from 'react';
import type { CasesContextProps } from '../../components/cases_context';
import type { RecentCasesProps } from '../../components/recent_cases';
type GetRecentCasesPropsInternal = RecentCasesProps & CasesContextProps;
export type GetRecentCasesProps = Omit<GetRecentCasesPropsInternal, 'externalReferenceAttachmentTypeRegistry' | 'persistableStateAttachmentTypeRegistry' | 'unifiedAttachmentTypeRegistry' | 'getFilesClient'>;
export declare const getRecentCasesLazy: ({ externalReferenceAttachmentTypeRegistry, persistableStateAttachmentTypeRegistry, unifiedAttachmentTypeRegistry, getFilesClient, owner, permissions, maxCasesToShow, }: GetRecentCasesPropsInternal) => React.JSX.Element;
export {};
