/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { CASES_CONFIGURE_TEMPLATES_PATH, STACK_APP_ID } from '../../../../common/constants';
import { useCasesContext } from '../../../components/cases_context/use_cases_context';
import { useInvestigationsServices } from '../../services';
import * as i18n from './translations';

const MANAGEMENT_TEMPLATES_PATH = `insightsAndAlerting/cases${CASES_CONFIGURE_TEMPLATES_PATH}`;

/** Opens the Cases templates page, where investigation types are managed. */
export const ManageTypesLink: React.FC = () => {
  const { application } = useInvestigationsServices();
  const { permissions } = useCasesContext();

  if (!permissions.manageTemplates) {
    return null;
  }

  return (
    <EuiLink
      onClick={() => application.navigateToApp(STACK_APP_ID, { path: MANAGEMENT_TEMPLATES_PATH })}
      data-test-subj="investigationManageTypes"
    >
      {i18n.MANAGE_TYPES}
    </EuiLink>
  );
};
ManageTypesLink.displayName = 'ManageTypesLink';
