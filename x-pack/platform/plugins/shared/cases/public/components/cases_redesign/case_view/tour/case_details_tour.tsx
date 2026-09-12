/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { CaseUI } from '../../../../../common';
import { KibanaServices, useKibana } from '../../../../common/lib/kibana';
import { useNewFeatureSeen } from '../../../../common/use_new_feature_seen';
import { useCasesFeatures } from '../../../../common/use_cases_features';
import { useAddCaseToChat } from '../../../../agent_builder/use_add_case_to_chat';
import { LOCAL_STORAGE_KEYS } from '../../../../../common/constants';
import { useCasesContext } from '../../../cases_context/use_cases_context';
import { GuidedTour } from '../../../tour/guided_tour';
import { getCaseDetailsTourSteps, CASE_DETAILS_TOUR_STEP_TEST_ID } from './tour_steps';

/**
 * Auto-firing guided tour for the redesigned case details page. Runs once per browser, then
 * persists a "seen" flag. Steps are built from the current permissions/config so only rendered
 * targets are included; the tour engine additionally skips any step whose anchor isn't in the DOM
 * when reached. Respects the global `hideAnnouncements` opt-out.
 */
interface CaseDetailsTourProps {
  caseData: CaseUI;
}

export const CaseDetailsTour: React.FC<CaseDetailsTourProps> = ({ caseData }) => {
  const {
    services: { notifications },
  } = useKibana();
  const isTourEnabled = notifications.tours.isEnabled();

  const { permissions } = useCasesContext();
  const { pushToServiceAuthorized, hasCaseSettings } = useCasesFeatures();
  const { isAddToChatAvailable } = useAddCaseToChat(caseData);
  const isTemplatesEnabled = KibanaServices.getConfig()?.templates?.enabled ?? false;

  const { isNew, markSeen } = useNewFeatureSeen(LOCAL_STORAGE_KEYS.caseDetailsTourSeen);

  const steps = useMemo(
    () =>
      getCaseDetailsTourSteps({
        canCreateComment: permissions.createComment,
        canUpdate: permissions.update,
        hasCaseSettings,
        isAddToChatAvailable,
        isTemplatesEnabled,
        isConnectorAuthorized: pushToServiceAuthorized,
      }),
    [
      permissions.createComment,
      permissions.update,
      hasCaseSettings,
      isAddToChatAvailable,
      isTemplatesEnabled,
      pushToServiceAuthorized,
    ]
  );

  if (!isTourEnabled) {
    return null;
  }

  return (
    <GuidedTour
      steps={steps}
      isActive={isNew}
      onFinish={markSeen}
      testIdPrefix={CASE_DETAILS_TOUR_STEP_TEST_ID}
    />
  );
};
CaseDetailsTour.displayName = 'CaseDetailsTour';
