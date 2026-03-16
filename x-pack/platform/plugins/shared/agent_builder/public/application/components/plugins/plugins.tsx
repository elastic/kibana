/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { labels } from '../../utils/i18n';
import { useUiPrivileges } from '../../hooks/use_ui_privileges';
import { AgentBuilderPluginsTable } from './plugins_table';
import { InstallPluginButton } from './install_plugin_button';

export const AgentBuilderPlugins = () => {
  const { euiTheme } = useEuiTheme();
  const { manageTools } = useUiPrivileges();

  return (
    <KibanaPageTemplate data-test-subj="agentBuilderPluginsPage">
      <KibanaPageTemplate.Header
        pageTitle={labels.plugins.title}
        description={i18n.translate('xpack.agentBuilder.plugins.pluginsDescription', {
          defaultMessage:
            'Plugins are installable packages that bundle agent capabilities such as skills, and are compatible with the Claude agent plugin specification.',
        })}
        css={css`
          background-color: ${euiTheme.colors.backgroundBasePlain};
          border-block-end: none;
        `}
        rightSideItems={[manageTools && <InstallPluginButton key="install-plugin-button" />]}
      />
      <KibanaPageTemplate.Section>
        <AgentBuilderPluginsTable />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
