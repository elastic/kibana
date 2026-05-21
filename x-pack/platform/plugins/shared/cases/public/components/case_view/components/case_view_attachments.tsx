/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldSearch, EuiFlexItem, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';
import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import type { CaseUI } from '../../../../common';
import { FILE_ATTACHMENT_TYPE } from '../../../../common/constants';
import { toUnifiedAttachmentType } from '../../../../common/utils/attachments/migration_utils';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { useCasesFeatures } from '../../../common/use_cases_features';
import { SEARCH_PLACEHOLDER } from '../../actions/translations';
import { CaseViewAttachButton } from './case_view_attach_button';
import { CaseViewTabs } from '../case_view_tabs';
import { OBSERVABLES_TAB } from '../translations';
import { CaseViewObservables } from './case_view_observables';
import type { OnUpdateFields } from '../types';
import { AttachmentAccordion } from './attachment_accordion';
import { useGetCaseFileStats } from '../../../containers/use_get_case_file_stats';

interface CaseViewAttachmentsProps {
  caseData: CaseUI;
  onSearch: (searchTerm: string) => void;
  searchTerm?: string;
  onUpdateField: (args: OnUpdateFields) => void;
}

export const CaseViewAttachments = ({
  caseData,
  onSearch,
  searchTerm,
  onUpdateField,
}: CaseViewAttachmentsProps) => {
  const { unifiedAttachmentTypeRegistry } = useCasesContext();
  const { observablesAuthorized, isObservablesFeatureEnabled } = useCasesFeatures();
  const { data: fileStats } = useGetCaseFileStats({ caseId: caseData.id, searchTerm });
  const fileCount = fileStats?.total ?? 0;

  const owner = Array.isArray(caseData.owner) ? caseData.owner[0] : caseData.owner;

  const countsByType = useMemo(() => {
    const counts = new Map<string, number>();
    for (const comment of caseData.comments) {
      const unifiedType = toUnifiedAttachmentType(comment.type, owner);
      counts.set(unifiedType, (counts.get(unifiedType) ?? 0) + 1);
    }
    return counts;
  }, [caseData.comments, owner]);

  // Render one accordion per registered type that has a tab view AND a non-zero count
  const attachmentSections = useMemo(
    () =>
      unifiedAttachmentTypeRegistry
        .list()
        .flatMap((type) => {
          const Children = type.getAttachmentTabViewObject?.()?.children;
          if (!Children) return [];
          // file count rely on file client as source of truth
          const count =
            type.id === FILE_ATTACHMENT_TYPE ? fileCount : countsByType.get(type.id) ?? 0;
          if (count < 1) return [];
          return [{ id: type.id, displayName: type.displayName, count, Children }];
        })
        .sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [unifiedAttachmentTypeRegistry, countsByType, fileCount]
  );

  // Observables stays hardcoded: there's no other entry point to add observables
  // to a case, so the accordion must be visible even when the count is 0.
  const showObservables = observablesAuthorized && isObservablesFeatureEnabled;

  return (
    <>
      <EuiFlexItem grow={6} data-test-subj="case-view-attachments">
        <CaseViewTabs
          caseData={caseData}
          activeTab={CASE_VIEW_PAGE_TABS.ATTACHMENTS}
          searchTerm={searchTerm}
        />
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow>
            <EuiFieldSearch
              placeholder={SEARCH_PLACEHOLDER}
              onSearch={onSearch}
              data-test-subj="cases-files-search"
              fullWidth
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <CaseViewAttachButton caseId={caseData.id} fill />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiFlexGroup direction="column" gutterSize="m">
          {attachmentSections.map(({ id, displayName, count, Children }) => (
            <AttachmentAccordion key={id} id={id} title={displayName} count={count}>
              <Children caseData={caseData} searchTerm={searchTerm} />
            </AttachmentAccordion>
          ))}
          {showObservables && (
            <AttachmentAccordion
              id="observables"
              title={OBSERVABLES_TAB}
              count={caseData.observables?.length ?? 0}
            >
              <CaseViewObservables
                isLoading={false}
                caseData={caseData}
                searchTerm={searchTerm}
                onUpdateField={onUpdateField}
              />
            </AttachmentAccordion>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </>
  );
};
CaseViewAttachments.displayName = 'CaseViewAttachments';
