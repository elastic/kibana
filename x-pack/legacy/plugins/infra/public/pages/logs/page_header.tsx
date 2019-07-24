/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { injectI18n, InjectedIntl } from '@kbn/i18n/react';
import React from 'react';

import { UICapabilities } from 'ui/capabilities';
import { injectUICapabilities } from 'ui/capabilities/react';
import { DocumentTitle } from '../../components/document_title';
import { Header } from '../../components/header';
import { HelpCenterContent } from '../../components/help_center_content';
import { SourceConfigurationFlyout } from '../../components/source_configuration';

interface LogsPageHeaderProps {
  intl: InjectedIntl;
  uiCapabilities: UICapabilities;
}

export const LogsPageHeader = injectUICapabilities(
  injectI18n((props: LogsPageHeaderProps) => {
    const { intl, uiCapabilities } = props;
    return (
      <>
        <Header
          breadcrumbs={[
            {
              text: intl.formatMessage({
                id: 'xpack.infra.logsPage.logsBreadcrumbsText',
                defaultMessage: 'Logs',
              }),
            },
          ]}
          readOnlyBadge={!uiCapabilities.logs.save}
        />
        <DocumentTitle
          title={intl.formatMessage({
            id: 'xpack.infra.logsPage.documentTitle',
            defaultMessage: 'Logs',
          })}
        />
        <HelpCenterContent
          feedbackLink="https://discuss.elastic.co/c/logs"
          feedbackLinkText={intl.formatMessage({
            id: 'xpack.infra.logsPage.logsHelpContent.feedbackLinkText',
            defaultMessage: 'Provide feedback for Logs',
          })}
        />
        <SourceConfigurationFlyout
          shouldAllowEdit={uiCapabilities.logs.configureSource as boolean}
        />
      </>
    );
  })
);
