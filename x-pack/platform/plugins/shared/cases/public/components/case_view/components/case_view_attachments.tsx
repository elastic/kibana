/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexItem,
  EuiFlexGroup,
  EuiImage,
  EuiSpacer,
  EuiSuperUpdateButton,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRefreshCaseViewPage } from '../use_on_refresh_case_view_page';
import noResultsIllustration from '../../../assets/illustration_product_no_results_magnifying_glass.svg';
import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import type { CaseUI } from '../../../../common';
import { FILE_ATTACHMENT_TYPE } from '../../../../common/constants';
import { toUnifiedAttachmentType } from '../../../../common/utils/attachments/migration_utils';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { useCasesFeatures } from '../../../common/use_cases_features';
import { SEARCH_PLACEHOLDER } from '../../actions/translations';
import { CaseViewAttachButton } from './case_view_attach_button';
import { CaseViewTabs } from '../case_view_tabs';
import { CaseViewObservables } from './case_view_observables';
import { useCaseObservables } from '../use_case_observables';
import type { OnUpdateFields } from '../types';
import { AttachmentAccordion } from './attachment_accordion';
import { useGetCaseFileStats } from '../../../containers/use_get_case_file_stats';
import { getAttachmentItemCount } from './helpers';
import { NO_SEARCH_RESULTS_TITLE, NO_SEARCH_RESULTS_BODY } from '../translations';

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
  const { euiTheme } = useEuiTheme();
  const { unifiedAttachmentTypeRegistry } = useCasesContext();
  const { observablesAuthorized, isObservablesFeatureEnabled } = useCasesFeatures();
  const { data: fileStats } = useGetCaseFileStats({ caseId: caseData.id, searchTerm });
  const fileCount = fileStats?.total ?? 0;

  const owner = Array.isArray(caseData.owner) ? caseData.owner[0] : caseData.owner;

  const countsByType = useMemo(() => {
    const counts = new Map<string, number>();
    for (const comment of caseData.comments) {
      const unifiedType = toUnifiedAttachmentType(comment.type, owner);
      counts.set(unifiedType, (counts.get(unifiedType) ?? 0) + getAttachmentItemCount(comment));
    }
    return counts;
  }, [caseData.comments, owner]);

  // Render one accordion per registered type that has a tab view AND a non-zero count.
  // file count uses the file client as the source of truth
  const attachmentSections = useMemo(
    () =>
      unifiedAttachmentTypeRegistry
        .list()
        .flatMap((type) => {
          const Children = type.getAttachmentTabViewObject?.()?.children;
          if (!Children) return [];
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
  const { observables: filteredObservables, isLoading: isLoadingObservables } = useCaseObservables(
    caseData,
    searchTerm
  );

  const showNoResults = useMemo(
    () =>
      Boolean(searchTerm) &&
      attachmentSections.length === 0 &&
      (!showObservables || filteredObservables.length === 0),
    [searchTerm, attachmentSections.length, showObservables, filteredObservables.length]
  );

  const [inputValue, setInputValue] = useState(searchTerm ?? '');
  useEffect(() => {
    setInputValue(searchTerm ?? '');
  }, [searchTerm]);

  const refreshCaseView = useRefreshCaseViewPage();
  const isDirty = inputValue !== (searchTerm ?? '');
  const onClickUpdate = useCallback(() => {
    if (isDirty) {
      onSearch(inputValue);
    } else {
      refreshCaseView();
    }
  }, [isDirty, inputValue, onSearch, refreshCaseView]);

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
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onSearch={onSearch}
              data-test-subj="cases-files-search"
              fullWidth
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSuperUpdateButton
              fill={false}
              needsUpdate={isDirty}
              onClick={onClickUpdate}
              data-test-subj="cases-attachments-update-button"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <CaseViewAttachButton caseId={caseData.id} fill />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        {showNoResults ? (
          <EuiEmptyPrompt
            data-test-subj="case-view-attachments-no-search-results"
            layout="horizontal"
            color="transparent"
            css={{ paddingBlockStart: euiTheme.size.xxl }}
            icon={
              <EuiImage
                css={{ width: 200, height: 148 }}
                size="200"
                alt=""
                url={noResultsIllustration}
              />
            }
            title={<h2>{NO_SEARCH_RESULTS_TITLE}</h2>}
            body={<p>{NO_SEARCH_RESULTS_BODY}</p>}
          />
        ) : (
          <EuiFlexGroup direction="column" gutterSize="m">
            {attachmentSections.map(({ id, displayName, count, Children }) => (
              <AttachmentAccordion key={id} id={id} title={displayName} count={count}>
                <Children caseData={caseData} searchTerm={searchTerm} />
              </AttachmentAccordion>
            ))}
            {showObservables && (
              <CaseViewObservables
                caseData={caseData}
                observables={filteredObservables}
                isLoading={isLoadingObservables}
                searchTerm={searchTerm}
                onUpdateField={onUpdateField}
              />
            )}
          </EuiFlexGroup>
        )}
      </EuiFlexItem>
    </>
  );
};
CaseViewAttachments.displayName = 'CaseViewAttachments';
