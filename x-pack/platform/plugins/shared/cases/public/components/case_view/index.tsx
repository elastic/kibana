/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';

import { useGetCase } from '../../containers/use_get_case';
import * as i18n from './translations';
import { CasesTimelineIntegrationProvider } from '../timeline_context';
import { DoesNotExist } from './does_not_exist';
import { useKibana } from '../../common/lib/kibana';
import { useCasesContext } from '../cases_context/use_cases_context';
import { generateCaseViewPath, useCaseViewParams } from '../../common/navigation';
import { CaseViewPage } from './case_view_page';
import type { CaseViewProps } from './types';

export const CaseViewLoading = () => (
  <EuiFlexGroup gutterSize="none" justifyContent="center" alignItems="center">
    <EuiFlexItem grow={false}>
      <EuiLoadingSpinner data-test-subj="case-view-loading" size="xl" />
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const CaseView = React.memo(
  ({
    actionsNavigation,
    ruleDetailsNavigation,
    showAlertDetails,
    timelineIntegration,
    useFetchAlertData,
    onAlertsTableLoaded,
    refreshRef,
    renderAlertsTable,
  }: CaseViewProps) => {
    const { spaces: spacesApi } = useKibana().services;
    const { detailName: caseId } = useCaseViewParams();
    const { basePath } = useCasesContext();

    const { data, isLoading, isError, refetch } = useGetCase(caseId);

    useEffect(() => {
      if (spacesApi && data?.outcome === 'aliasMatch' && data.aliasTargetId != null) {
        const newPath = `${basePath}${generateCaseViewPath({ detailName: data.aliasTargetId })}`;
        spacesApi.ui.redirectLegacyUrl({
          path: `${newPath}${window.location.search}${window.location.hash}`,
          aliasPurpose: data.aliasPurpose,
          objectNoun: i18n.CASE,
        });
      }
    }, [basePath, data, spacesApi]);

    const getLegacyUrlConflictCallout = useCallback(() => {
      // This function returns a callout component *if* we have encountered a "legacy URL conflict" scenario
      if (data && spacesApi && data.outcome === 'conflict' && data.aliasTargetId != null) {
        // We have resolved to one object, but another object has a legacy URL alias associated with this ID/page. We should display a
        // callout with a warning for the user, and provide a way for them to navigate to the other object.
        const otherObjectPath = `${basePath}${generateCaseViewPath({
          detailName: data.aliasTargetId,
        })}${window.location.search}${window.location.hash}`;

        return spacesApi.ui.components.getLegacyUrlConflict({
          objectNoun: i18n.CASE,
          currentObjectId: data.case.id,
          otherObjectId: data.aliasTargetId,
          otherObjectPath,
        });
      }
      return null;
    }, [basePath, data, spacesApi]);

    return isError ? (
      <DoesNotExist caseId={caseId} />
    ) : isLoading ? (
      <CaseViewLoading />
    ) : data ? (
      <CasesTimelineIntegrationProvider timelineIntegration={timelineIntegration}>
        {getLegacyUrlConflictCallout()}
        <CaseViewPage
          caseData={data.case}
          fetchCase={refetch}
          actionsNavigation={actionsNavigation}
          ruleDetailsNavigation={ruleDetailsNavigation}
          showAlertDetails={showAlertDetails}
          useFetchAlertData={useFetchAlertData}
          onAlertsTableLoaded={onAlertsTableLoaded}
          refreshRef={refreshRef}
          renderAlertsTable={renderAlertsTable}
        />
      </CasesTimelineIntegrationProvider>
    ) : null;
  }
);

CaseViewLoading.displayName = 'CaseViewLoading';
CaseView.displayName = 'CaseView';

// eslint-disable-next-line import/no-default-export
export { CaseView as default };
