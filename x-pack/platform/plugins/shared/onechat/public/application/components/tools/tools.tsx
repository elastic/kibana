/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React from 'react';
import { OnechatBaseTools } from './base/base_tools';
import { OnechatEsqlTools } from './esql/esql_tools';

export const OnechatTools = () => {
  return (
    <KibanaPageTemplate>
      <KibanaPageTemplate.Header
        pageTitle={i18n.translate('xpack.onechat.tools.title', {
          defaultMessage: 'Tools',
        })}
        description={i18n.translate('xpack.onechat.tools.toolsDescription', {
          defaultMessage:
            'Functionality used to enhance the capabilities of your AI agents in your chat experience by allowing them to perform specific tasks or access additional information.',
        })}
      />
      <KibanaPageTemplate.Section>
        <OnechatEsqlTools />
        <EuiSpacer size="xl" />
        <OnechatBaseTools />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
