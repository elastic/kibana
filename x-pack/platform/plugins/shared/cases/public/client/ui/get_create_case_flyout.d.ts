import React from 'react';
import type { CreateCaseFlyoutProps } from '../../components/create/flyout';
import type { CasesContextProps } from '../../components/cases_context';
type GetCreateCaseFlyoutPropsInternal = CreateCaseFlyoutProps & CasesContextProps;
export type GetCreateCaseFlyoutProps = Omit<GetCreateCaseFlyoutPropsInternal, 'externalReferenceAttachmentTypeRegistry' | 'persistableStateAttachmentTypeRegistry' | 'unifiedAttachmentTypeRegistry' | 'getFilesClient'>;
export declare const CreateCaseFlyoutLazy: React.FC<CreateCaseFlyoutProps>;
export declare const getCreateCaseFlyoutLazy: ({ externalReferenceAttachmentTypeRegistry, persistableStateAttachmentTypeRegistry, unifiedAttachmentTypeRegistry, getFilesClient, owner, permissions, features, afterCaseCreated, onClose, onSuccess, attachments, observables, }: GetCreateCaseFlyoutPropsInternal) => React.JSX.Element;
export declare const getCreateCaseFlyoutLazyNoProvider: (props: CreateCaseFlyoutProps) => React.JSX.Element;
export {};
