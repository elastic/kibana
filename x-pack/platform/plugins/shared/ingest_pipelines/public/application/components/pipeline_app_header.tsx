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
import { getListPath } from '../services/navigation';

export const ingestPipelinesListTitle = i18n.translate('xpack.ingestPipelines.list.listTitle', {
  defaultMessage: 'Ingest pipelines',
});

interface Props {
  title: string;
  history: Pick<History, 'createHref'>;
  docLink?: string;
  menu?: AppHeaderMenu;
}

export const PipelineAppHeader = ({ title, history, docLink, menu }: Props) => (
  <>
    <AppHeader
      title={title}
      back={{
        href: history.createHref({ pathname: getListPath() }),
        label: ingestPipelinesListTitle,
      }}
      docLink={docLink}
      menu={menu}
      spacing="bleed"
    />
    <EuiSpacer size="l" />
  </>
);
