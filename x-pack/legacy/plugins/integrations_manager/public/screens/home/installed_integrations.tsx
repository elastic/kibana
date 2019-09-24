/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { IntegrationList } from '../../../common/types';
import { IntegrationListGrid } from '../../components/integration_list_grid';

interface InstalledIntegrationsProps {
  list: IntegrationList;
}

export function InstalledIntegrations({ list }: InstalledIntegrationsProps) {
  const installedTitle = 'Your Integrations';

  return <IntegrationListGrid title={installedTitle} list={list} controls={<div />} />;
}
