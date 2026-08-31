/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderMenu } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { docLinks } from '../../common/doc_links';

interface ExternalInferenceHeaderProps {
  canManage: boolean;
  onFlyoutOpen: () => void;
}

export const ExternalInferenceHeader: React.FC<ExternalInferenceHeaderProps> = ({
  canManage,
  onFlyoutOpen,
}) => {
  const menu = useMemo<AppHeaderMenu>(
    () => ({
      ...(canManage
        ? {
            primaryActionItem: {
              id: 'addInferenceEndpoint',
              label: i18n.translate('xpack.searchInferenceEndpoints.addConnectorButtonLabel', {
                defaultMessage: 'Add endpoint',
              }),
              iconType: 'plusCircle' as const,
              run: onFlyoutOpen,
              testId: 'add-inference-endpoint-header-button',
            },
          }
        : {}),
      items: [],
    }),
    [canManage, onFlyoutOpen]
  );

  return (
    <AppHeader
      title={i18n.translate('xpack.searchInferenceEndpoints.externalInferenceTitle', {
        defaultMessage: 'External Inference',
      })}
      description={i18n.translate(
        'xpack.searchInferenceEndpoints.allInferenceEndpoints.description',
        {
          defaultMessage:
            'Inference endpoints streamline the deployment and management of machine learning models in Elasticsearch. Set up and manage NLP tasks using unique endpoints, to build AI-powered search.',
        }
      )}
      menu={menu}
      docLink={docLinks.createInferenceEndpoint}
      spacing="bleed"
    />
  );
};
