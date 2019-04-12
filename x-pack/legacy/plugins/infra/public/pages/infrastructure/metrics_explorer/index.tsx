/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';
import { DocumentTitle } from '../../../components/document_title';

interface MetricsExplorerPageProps {
  intl: InjectedIntl;
}

export const MetricsExplorerPage = injectI18n(({ intl }: MetricsExplorerPageProps) => (
  <div>
    <DocumentTitle
      title={(previousTitle: string) =>
        intl.formatMessage(
          {
            id: 'xpack.infra.infrastructureMetricsExplorerPage.documentTitle',
            defaultMessage: '{previousTitle} | Metrics explorer',
          },
          {
            previousTitle,
          }
        )
      }
    />
    Metrics Explorer
  </div>
));
