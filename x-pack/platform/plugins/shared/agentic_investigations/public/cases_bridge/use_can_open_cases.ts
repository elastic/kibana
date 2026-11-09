/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { CasesPublicStart } from '@kbn/cases-plugin/public';
import { ALERTZERO_CASE_OWNER } from '../../common/cases_bridge';
import { useCanManageInvestigations } from '../investigations/hooks/use_can_manage_investigations';

/**
 * Opening a case from an investigation needs the investigations manage privilege and Cases create
 * for Security; adding to an existing case needs Cases update.
 */
export const useCanOpenCases = (): { canOpen: boolean; canAddToExisting: boolean } => {
  const { services } = useKibana<CoreStart & { cases?: CasesPublicStart }>();
  const canManageInvestigations = useCanManageInvestigations();
  const permissions = services.cases?.helpers.canUseCases([ALERTZERO_CASE_OWNER]);
  return {
    canOpen: canManageInvestigations && permissions?.create === true,
    canAddToExisting: canManageInvestigations && permissions?.update === true,
  };
};

export const useCanOpenCaseFromInvestigation = (): boolean => useCanOpenCases().canOpen;
