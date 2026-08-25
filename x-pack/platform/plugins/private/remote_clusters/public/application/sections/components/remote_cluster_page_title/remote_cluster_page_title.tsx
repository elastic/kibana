/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AppHeader } from '@kbn/app-header';
import { remoteClustersUrl } from '../../../services/documentation';

interface Props {
  title: string;
  description?: string;
  backHref?: string;
}

export const RemoteClusterPageTitle: React.FC<Props> = ({ title, description, backHref }) => (
  <>
    <AppHeader
      title={title}
      description={description}
      back={
        backHref
          ? {
              href: backHref,
              label: i18n.translate('xpack.remoteClusters.backToListLabel', {
                defaultMessage: 'Remote Clusters',
              }),
            }
          : undefined
      }
      docLink={remoteClustersUrl}
      spacing="bleed"
    />

    <EuiSpacer size="l" />
  </>
);
