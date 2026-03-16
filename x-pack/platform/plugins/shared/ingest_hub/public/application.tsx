/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageTemplate, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import type { IngestFlowRegistration } from './types';

interface IngestHubAppProps {
  coreStart: CoreStart;
  ingestFlows: IngestFlowRegistration[];
}

export const IngestHubApp: React.FC<IngestHubAppProps> = () => {
  return (
    <EuiPageTemplate>
      <EuiPageTemplate.Header>
        <EuiTitle size="l">
          <h1>
            {i18n.translate('xpack.ingestHub.pageTitle', {
              defaultMessage: 'Ingest Hub',
            })}
          </h1>
        </EuiTitle>
      </EuiPageTemplate.Header>
      <EuiPageTemplate.Section />
    </EuiPageTemplate>
  );
};
