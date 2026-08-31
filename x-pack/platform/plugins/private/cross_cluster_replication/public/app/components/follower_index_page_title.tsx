/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { AppHeader, type AppHeaderBack } from '@kbn/app-header';

import { documentationLinks } from '../services/documentation_links';

interface Props {
  title: string;
  back: AppHeaderBack;
}

export const FollowerIndexPageTitle = ({ title, back }: Props) => (
  <>
    <AppHeader
      title={title}
      back={back}
      docLink={documentationLinks.apis.createFollower}
      spacing="bleed"
    />

    <EuiSpacer size="l" />
  </>
);
