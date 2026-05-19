import React from 'react';
import type { AllCasesSelectorModalProps } from '../../components/all_cases/selector_modal';
import type { CasesContextProps } from '../../components/cases_context';
type GetAllCasesSelectorModalPropsInternal = AllCasesSelectorModalProps & CasesContextProps;
export type GetAllCasesSelectorModalProps = Omit<GetAllCasesSelectorModalPropsInternal, 'externalReferenceAttachmentTypeRegistry' | 'persistableStateAttachmentTypeRegistry' | 'unifiedAttachmentTypeRegistry' | 'getFilesClient'>;
export declare const getAllCasesSelectorModalLazy: ({ externalReferenceAttachmentTypeRegistry, persistableStateAttachmentTypeRegistry, unifiedAttachmentTypeRegistry, getFilesClient, owner, permissions, hiddenStatuses, onRowClick, onClose, }: GetAllCasesSelectorModalPropsInternal) => React.JSX.Element;
/**
 * Same as getAllCasesSelectorModalLazy but without injecting the
 * cases provider. to be further refactored https://github.com/elastic/kibana/issues/123183
 */
export declare const getAllCasesSelectorModalNoProviderLazy: ({ hiddenStatuses, onRowClick, onClose, getAttachments, }: AllCasesSelectorModalProps) => React.JSX.Element;
export {};
