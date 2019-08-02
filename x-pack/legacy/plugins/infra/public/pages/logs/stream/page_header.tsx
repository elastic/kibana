/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';

import { UICapabilities } from 'ui/capabilities';
import { injectUICapabilities } from 'ui/capabilities/react';
import { DocumentTitle } from '../../../components/document_title';
import { Header } from '../../../components/header';

interface StreamPageHeaderProps {
  uiCapabilities: UICapabilities;
}

export const StreamPageHeader = injectUICapabilities((props: StreamPageHeaderProps) => {
  const { uiCapabilities } = props;
  return (
    <>
      <Header
        breadcrumbs={[
          {
            text: i18n.translate('xpack.infra.logs.streamPage.logsBreadcrumbsText', {
              defaultMessage: 'Logs',
            }),
          },
        ]}
        readOnlyBadge={!uiCapabilities.logs.save}
      />
      <DocumentTitle
        title={(previousTitle: string) =>
          i18n.translate('xpack.infra.logs.streamPage.documentTitle', {
            defaultMessage: '{previousTitle} | Stream',
            values: {
              previousTitle,
            },
          })
        }
      />
    </>
  );
});
