/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { MemoryRouter } from 'react-router-dom';

import { INTEGRATIONS_ROUTING_PATHS } from '../../../../constants';

import { EPMHomePage as Component } from '.';

export default {
  title: 'Sections/EPM/Home',
};

export const BrowseIntegrations = () => (
  <MemoryRouter initialEntries={[INTEGRATIONS_ROUTING_PATHS.integrations_all]}>
    <Component />
  </MemoryRouter>
);

export const InstalledIntegrations = () => (
  <MemoryRouter initialEntries={[INTEGRATIONS_ROUTING_PATHS.integrations_installed]}>
    <Component />
  </MemoryRouter>
);
