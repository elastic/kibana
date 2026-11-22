/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { useCasesContext } from '../../../components/cases_context/use_cases_context';
import { useInvestigationsNavigation } from '../../hooks';
import { TEMPLATES_PATH } from '../settings/paths';
import * as i18n from './translations';

/** Opens Investigation settings, Investigation templates, inside this app. */
export const ManageTemplatesLink: React.FC = () => {
  const { navigate, getHref } = useInvestigationsNavigation();
  const { permissions } = useCasesContext();

  if (!permissions.manageTemplates) {
    return null;
  }

  return (
    <EuiLink
      href={getHref(TEMPLATES_PATH)}
      onClick={(event: React.MouseEvent) => {
        event.preventDefault();
        navigate(TEMPLATES_PATH);
      }}
      data-test-subj="investigationManageTemplates"
    >
      {i18n.MANAGE_TEMPLATES}
    </EuiLink>
  );
};
ManageTemplatesLink.displayName = 'ManageTemplatesLink';
