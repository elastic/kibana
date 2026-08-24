/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { AppHeader, type AppHeaderBack } from '@kbn/app-header';
import { remoteClustersUrl } from '../../../services/documentation';

interface Props {
  title: string;
  description?: string;
  back?: AppHeaderBack;
}

export const RemoteClusterPageTitle: React.FC<Props> = ({ title, description, back }) => (
  <>
    <AppHeader
      title={title}
      description={description}
      back={back}
      docLink={remoteClustersUrl}
      spacing="bleed"
    />

    <EuiSpacer size="l" />
  </>
);
