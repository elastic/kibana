import type { PropsWithChildren } from 'react';
import React from 'react';
import type { CasesContextProps } from '../../components/cases_context';
export type GetCasesContextPropsInternal = CasesContextProps;
export type GetCasesContextProps = Omit<CasesContextProps, 'externalReferenceAttachmentTypeRegistry' | 'persistableStateAttachmentTypeRegistry' | 'unifiedAttachmentTypeRegistry' | 'getFilesClient'>;
export declare const getCasesContextLazy: ({ externalReferenceAttachmentTypeRegistry, persistableStateAttachmentTypeRegistry, unifiedAttachmentTypeRegistry, getFilesClient, }: Pick<GetCasesContextPropsInternal, "externalReferenceAttachmentTypeRegistry" | "persistableStateAttachmentTypeRegistry" | "unifiedAttachmentTypeRegistry" | "getFilesClient">) => (() => React.FC<PropsWithChildren<GetCasesContextProps>>);
