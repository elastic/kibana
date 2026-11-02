/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { getAgenticInvestigationsCapabilities } from '../../hooks/use_agentic_investigations_capabilities';
import { useInvestigationsPrivileges } from '../../investigations/hooks/use_can_manage_investigations';

/**
 * Whether the user may create, link, assign, or change the status of escalations. The UI
 * capability answers directly; otherwise the shared privileges probe is asked, for users who
 * hold the escalations API privilege through another feature.
 */
export const useCanManageEscalations = (): boolean => {
  const {
    services: { application },
  } = useKibana<CoreStart>();
  const { manageEscalations } = getAgenticInvestigationsCapabilities(application.capabilities);
  const privileges = useInvestigationsPrivileges(!manageEscalations);

  return manageEscalations || privileges?.escalations.manage === true;
};

/** Whether the user may see escalations, answered like `useCanManageEscalations`. */
export const useCanReadEscalations = (): boolean => {
  const {
    services: { application },
  } = useKibana<CoreStart>();
  const { showEscalations } = getAgenticInvestigationsCapabilities(application.capabilities);
  const privileges = useInvestigationsPrivileges(!showEscalations);

  return showEscalations || privileges?.escalations.read === true;
};
