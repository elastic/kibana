/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { AppHeader } from '@kbn/app-header';
import { CaseMetricsFeature } from '../../../../common/types/api';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { useCasesTitleBreadcrumbs } from '../../use_breadcrumbs';
import { CaseViewMetrics } from '../../case_view/metrics';
import type { CaseViewPageProps } from '../../case_view/types';

import { useOnUpdateField } from '../../case_view/use_on_update_field';
import { filterCaseAttachmentsBySearchTerm } from '../../case_view/components/helpers';
import { PAGE_TITLE } from '../../../common/translations';
import { useCasesFeatures } from '../../../common/use_cases_features';
import { ConfirmDeleteCaseModal } from '../../confirm_delete_case';
import { CaseSettingsPopover } from './components/case_settings_popover';
import { CaseViewTabContent } from './components/case_view_tab_content';
import { useCaseRefreshRef } from './hooks/use_case_refresh_ref';
import { useCaseViewHeader } from './hooks/use_case_view_header';

type CaseViewPageRedesignProps = Omit<CaseViewPageProps, 'fetchCase'>;

export const CaseViewPageRedesign = React.memo<CaseViewPageRedesignProps>(
  ({ caseData, refreshRef }) => {
    const { permissions } = useCasesContext();
    const { metricsFeatures } = useCasesFeatures();

    const [searchTerm, setSearchTerm] = useState<string>('');
    const [showMetrics, setShowMetrics] = useState(true);

    const onSearch = useCallback(
      (newSearch: string) => {
        setSearchTerm(newSearch.trim());
      },
      [setSearchTerm]
    );

    const caseWithFilteredAttachments = useMemo(
      () => filterCaseAttachmentsBySearchTerm(caseData, searchTerm),
      [caseData, searchTerm]
    );

    useCasesTitleBreadcrumbs(caseData.title);

    const { onUpdateField, isLoading } = useOnUpdateField({ caseData });
    useCaseRefreshRef({ refreshRef, isLoading });

    const {
      headerTitle,
      backHref,
      badges,
      menu,
      isDeleteModalVisible,
      setIsDeleteModalVisible,
      onConfirmDeletion,
      closeCaseModal,
      isSettingsOpen,
      setIsSettingsOpen,
      settingsAnchor,
    } = useCaseViewHeader({ caseData, onUpdateField });

    const onCaseNameChange = useCallback(
      (newName: string) => {
        onUpdateField({ key: 'title', value: newName });
      },
      [onUpdateField]
    );

    const onSyncAlertsChanged = useCallback(
      (checked: boolean) =>
        onUpdateField({
          key: 'settings',
          value: { ...caseData.settings, syncAlerts: checked },
        }),
      [caseData.settings, onUpdateField]
    );

    return (
      <>
        <AppHeader
          title={headerTitle}
          back={{ href: backHref, label: PAGE_TITLE }}
          badges={badges}
          menu={menu}
        />
        {showMetrics && metricsFeatures.includes(CaseMetricsFeature.LIFESPAN) && (
          <CaseViewMetrics data-test-subj="case-view-metrics" caseId={caseData.id} />
        )}
        <EuiSpacer size="l" />
        <CaseViewTabContent
          caseData={caseWithFilteredAttachments}
          searchTerm={searchTerm}
          onSearch={onSearch}
          onUpdateField={onUpdateField}
        />
        {closeCaseModal}
        {isDeleteModalVisible && (
          <ConfirmDeleteCaseModal
            totalCasesToBeDeleted={1}
            onCancel={() => setIsDeleteModalVisible(false)}
            onConfirm={onConfirmDeletion}
          />
        )}
        {settingsAnchor && permissions.update && (
          <CaseSettingsPopover
            caseData={caseData}
            syncAlerts={caseData.settings.syncAlerts}
            onSyncAlertsChange={onSyncAlertsChanged}
            showMetrics={showMetrics}
            onShowMetricsChange={setShowMetrics}
            onCaseNameChange={onCaseNameChange}
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            anchorElement={settingsAnchor}
          />
        )}
      </>
    );
  }
);
CaseViewPageRedesign.displayName = 'CaseViewPageRedesign';
