/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';

import { useGetCase } from '../../../containers/use_get_case';
import { CasesTimelineIntegrationProvider } from '../../timeline_context';
import { DoesNotExist } from '../../case_view/does_not_exist';
// TODO: Replace CaseViewLoading with a proper skeleton placeholder
import { CaseViewLoading } from '../../case_view';
import { useKibana } from '../../../common/lib/kibana';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { generateCaseViewPath, useCaseViewParams } from '../../../common/navigation';
import { CaseViewPageRedesign } from './case_view_page';
import type { CaseViewProps } from '../../case_view/types';
import { useCasePageViewEbt } from '../../case_view/use_case_page_view_ebt';
import * as i18n from '../../case_view/translations';

export const CaseViewRedesign = React.memo(({ timelineIntegration, refreshRef }: CaseViewProps) => {
  const { spaces: spacesApi } = useKibana().services;
  const { detailName: caseId } = useCaseViewParams();
  const { basePath } = useCasesContext();
  useCasePageViewEbt();

  const { data, isLoading, isError } = useGetCase(caseId);

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
    if (data && spacesApi && data.outcome === 'conflict' && data.aliasTargetId != null) {
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
      <CaseViewPageRedesign caseData={data.case} refreshRef={refreshRef} />
    </CasesTimelineIntegrationProvider>
  ) : null;
});

CaseViewRedesign.displayName = 'CaseViewRedesign';

// eslint-disable-next-line import/no-default-export
export { CaseViewRedesign as default };
