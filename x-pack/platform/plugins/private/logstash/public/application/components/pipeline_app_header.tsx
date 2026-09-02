/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { AppHeader, type AppHeaderMenu } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import type { History } from 'history';

export const logstashPipelinesListTitle = i18n.translate('xpack.logstash.pipelineList.head', {
  defaultMessage: 'Logstash pipelines',
});

export const logstashPipelinesListDescription = i18n.translate(
  'xpack.logstash.pipelineList.subhead',
  {
    defaultMessage: 'Manage logstash event processing and see the result visually',
  }
);

export const createPipelineButtonLabel = i18n.translate(
  'xpack.logstash.pipelinesTable.createPipelineButtonLabel',
  {
    defaultMessage: 'Create pipeline',
  }
);

interface Props {
  title: string;
  history: Pick<History, 'createHref'>;
  description?: string;
  menu?: AppHeaderMenu;
  showBack?: boolean;
}

export const PipelineAppHeader = ({ title, history, description, menu, showBack }: Props) => (
  <>
    <AppHeader
      title={title}
      description={description}
      menu={menu}
      back={
        showBack
          ? {
              href: history.createHref({ pathname: '/' }),
              label: logstashPipelinesListTitle,
            }
          : undefined
      }
      spacing="bleed"
    />
    <EuiSpacer size="l" />
  </>
);
