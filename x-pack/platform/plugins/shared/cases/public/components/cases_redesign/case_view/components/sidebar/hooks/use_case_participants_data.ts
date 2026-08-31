/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { CaseUI } from '../../../../../../../common';
import { useGetCaseUsers } from '../../../../../../containers/use_get_case_users';
import { parseCaseUsers } from '../../../../../utils';

/**
 * Participants and user profiles parsed out of the case users response, for
 * the "Attributes" sidebar section. Other cases-level data (permissions,
 * connectors, configuration, etc.) should be read from their own hooks where
 * they're actually needed instead of being funnelled through here.
 */
export const useCaseParticipantsData = ({ caseData }: { caseData: CaseUI }) => {
  const { data: caseUsers, isLoading: isLoadingCaseUsers } = useGetCaseUsers(caseData.id);

  const { userProfiles } = useMemo(
    () => parseCaseUsers({ caseUsers, createdBy: caseData.createdBy }),
    [caseUsers, caseData.createdBy]
  );

  const participants = useMemo(
    () => (caseUsers != null ? [...caseUsers.participants, ...caseUsers.assignees] : undefined),
    [caseUsers]
  );

  return useMemo(
    () => ({
      isLoadingCaseUsers,
      userProfiles,
      participants,
    }),
    [isLoadingCaseUsers, userProfiles, participants]
  );
};
