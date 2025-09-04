/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiContextMenu, EuiPopover, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { i18n } from '@kbn/i18n';
import { ToolType } from '@kbn/onechat-common';
import React, { useState } from 'react';
import { useToolsActions } from '../../context/tools_table_provider';
import { labels } from '../../utils/i18n';
import { OnechatToolsTable } from './table/tools_table';
export const OnechatTools = () => {
  const { euiTheme } = useEuiTheme();
  const { createTool } = useToolsActions();

  const [isCreateToolMenuOpen, setCreateToolMenuOpen] = useState(false);

  return (
    <KibanaPageTemplate>
      <KibanaPageTemplate.Header
        pageTitle={labels.tools.title}
        description={labels.tools.description}
        css={css`
          background-color: ${euiTheme.colors.backgroundBasePlain};
          border-block-end: none;
        `}
        rightSideItems={[
          <EuiPopover
            button={
              <EuiButton
                key="new-esql-tool-button"
                fill
                iconType="plusInCircleFilled"
                onClick={() => setCreateToolMenuOpen(true)}
              >
                <EuiText size="s">{labels.tools.newToolButton}</EuiText>
              </EuiButton>
            }
            isOpen={isCreateToolMenuOpen}
            closePopover={() => setCreateToolMenuOpen(false)}
            anchorPosition="downLeft"
            panelPaddingSize="none"
          >
            <EuiContextMenu
              initialPanelId={0}
              panels={[
                {
                  id: 0,
                  items: [
                    {
                      name: i18n.translate('xpack.onechat.tools.newEsqlToolButton', {
                        defaultMessage: 'New ES|QL tool',
                      }),
                      icon: 'code',
                      onClick: () => {
                        createTool(ToolType.esql);
                      },
                    },
                    {
                      name: i18n.translate('xpack.onechat.tools.newIndexSearchToolButton', {
                        defaultMessage: 'New index search tool',
                      }),
                      icon: 'search',
                      onClick: () => {
                        createTool(ToolType.index_search);
                      },
                    },
                  ],
                },
              ]}
            />
          </EuiPopover>,
        ]}
      />
      <KibanaPageTemplate.Section>
        <OnechatToolsTable />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
