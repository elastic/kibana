/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldSearch, EuiFlexItem, EuiFlexGroup, EuiSpacer, useEuiTheme } from '@elastic/eui';
import React, { useMemo } from 'react';
import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import type { CaseUI } from '../../../../common';
import { toUnifiedAttachmentType } from '../../../../common/utils/attachments/migration_utils';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { useCasesFeatures } from '../../../common/use_cases_features';
import { SEARCH_PLACEHOLDER } from '../../actions/translations';
import { CaseViewTabs } from '../case_view_tabs';
import { FILES_TAB, OBSERVABLES_TAB } from '../translations';
import { CaseViewFiles } from './case_view_files';
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
  const { euiTheme } = useEuiTheme();
  const { observablesAuthorized, isObservablesFeatureEnabled } = useCasesFeatures();
  const { data: fileStats } = useGetCaseFileStats({ caseId: caseData.id, searchTerm });

  const owner = Array.isArray(caseData.owner) ? caseData.owner[0] : caseData.owner;

  const countsByType = useMemo(() => {
    const counts = new Map<string, number>();
    for (const comment of caseData.comments) {
      const unifiedType = toUnifiedAttachmentType(comment.type, owner);
      counts.set(unifiedType, (counts.get(unifiedType) ?? 0) + 1);
    }
    return counts;
  }, [caseData.comments, owner]);

  const attachmentSections = useMemo(() => {
    return unifiedAttachmentTypeRegistry
      .list()
      .map((type) => {
        const tabViewChildren = type.getAttachmentTabViewObject?.()?.children;
        const count = countsByType.get(type.id) ?? 0;
        if (!tabViewChildren || count <= 0) {
          return null;
        }
        return {
          id: type.id,
          displayName: type.displayName,
          count,
          Children: tabViewChildren,
        };
      })
      .filter((section): section is NonNullable<typeof section> => section !== null);
  }, [unifiedAttachmentTypeRegistry, countsByType]);

  const showObservables = observablesAuthorized && isObservablesFeatureEnabled;

  return (
    <EuiFlexItem grow={6}>
      <CaseViewTabs
        caseData={caseData}
        activeTab={CASE_VIEW_PAGE_TABS.ATTACHMENTS}
        searchTerm={searchTerm}
      />
      <EuiSpacer size="s" />
      <EuiFieldSearch
        placeholder={SEARCH_PLACEHOLDER}
        onSearch={onSearch}
        data-test-subj="cases-files-search"
        fullWidth
      />
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="column" gutterSize="m">
        {attachmentSections.map(({ id, displayName, count, Children }) => (
          <AttachmentAccordion
            key={id}
            id={id}
            title={displayName}
            count={count}
            euiThemeSize={euiTheme.size.xs}
          >
            <Children caseData={caseData} />
          </AttachmentAccordion>
        ))}
        <AttachmentAccordion
          id="files"
          title={FILES_TAB}
          count={fileStats?.total ?? 0}
          euiThemeSize={euiTheme.size.xs}
        >
          <CaseViewFiles caseData={caseData} searchTerm={searchTerm} />
        </AttachmentAccordion>
        {showObservables && (
          <AttachmentAccordion
            id="observables"
            title={OBSERVABLES_TAB}
            count={caseData.observables?.length ?? 0}
            euiThemeSize={euiTheme.size.xs}
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
  );
};
CaseViewAttachments.displayName = 'CaseViewAttachments';
