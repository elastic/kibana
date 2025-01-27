/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useParams, Redirect } from 'react-router-dom';
import { capitalize } from 'lodash';

import { getCustomIntegrationsStart } from '../../../../../../services/custom_integrations';
import { useLink, useBreadcrumbs } from '../../../../hooks';
export interface CustomLanguageClientsParams {
  pkgkey: string;
}

// Renders the content of the component exported from custom language integrations
// This content gets displayed at url /app/integrations/language_clients/pkgkey/overview
// If there is no component exported, redirect to /integrations

export const CustomLanguagesOverview = () => {
  const { pkgkey } = useParams<CustomLanguageClientsParams>();
  const { getPath } = useLink();
  useBreadcrumbs('integration_details_overview', { pkgTitle: capitalize(pkgkey) });

  const Component = getCustomIntegrationsStart().languageClientsUiComponents[pkgkey];

  return Component ? <Component /> : <Redirect to={getPath('integrations_all')} />;
};
