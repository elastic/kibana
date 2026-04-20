/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { AppMenu } from '@kbn/core-chrome-app-menu';
import type {
  AppMenuConfig,
  AppMenuHeaderTab,
  AppMenuItemType,
} from '@kbn/core-chrome-app-menu-components';
import type { Section } from './constants';
import { useKibana } from '../common/lib/kibana';

export interface ManagementConnectorsHomeAppMenuProps {
  activeSection: Section;
  showCreateConnectorInMenu: boolean;
  onSectionChange: (section: Section) => void;
  onCreateConnectorClick: () => void;
}

/**
 * Project chrome: registers Stack Management Connectors header actions (Create connector,
 * Documentation) and section tabs in the shared AppMenuBar. Classic chrome keeps the
 * EuiPageHeader with tabs and actions.
 */
export const ManagementConnectorsHomeAppMenu: React.FC<ManagementConnectorsHomeAppMenuProps> = ({
  activeSection,
  showCreateConnectorInMenu,
  onSectionChange,
  onCreateConnectorClick,
}) => {
  const { chrome, docLinks } = useKibana().services;
  const chromeStyle = useObservable(chrome.getChromeStyle$(), chrome.getChromeStyle());
  const isProjectChrome = chromeStyle === 'project';

  const config = useMemo((): AppMenuConfig | undefined => {
    if (!isProjectChrome) {
      return undefined;
    }

    const overflowOnlyItems: AppMenuItemType[] = [
      {
        order: 10,
        id: 'management-connectors-documentation',
        label: i18n.translate('xpack.triggersActionsUI.connectors.home.documentationButtonLabel', {
          defaultMessage: 'Documentation',
        }),
        iconType: 'question',
        href: docLinks.links.alerting.actionTypes,
        target: '_blank',
        testId: 'documentationButton',
      },
    ];

    const headerTabs: AppMenuHeaderTab[] = [
      {
        id: 'connectors',
        label: (
          <FormattedMessage
            id="xpack.triggersActionsUI.connectors.home.connectorsTabTitle"
            defaultMessage="Connectors"
          />
        ),
        isSelected: activeSection === 'connectors',
        onClick: () => {
          onSectionChange('connectors');
        },
        testId: 'connectorsTab',
      },
      {
        id: 'logs',
        label: (
          <FormattedMessage
            id="xpack.triggersActionsUI.connectors.home.logsTabTitle"
            defaultMessage="Logs"
          />
        ),
        isSelected: activeSection === 'logs',
        onClick: () => {
          onSectionChange('logs');
        },
        testId: 'logsTab',
      },
    ];

    const menuConfig: AppMenuConfig = {
      layout: 'chromeBarV2',
      overflowOnlyItems,
      headerTabs,
    };

    if (showCreateConnectorInMenu) {
      menuConfig.primaryActionItem = {
        id: 'management-connectors-create',
        label: i18n.translate('xpack.triggersActionsUI.connectors.home.createConnector', {
          defaultMessage: 'Create connector',
        }),
        iconType: 'plus',
        run: () => {
          onCreateConnectorClick();
        },
        testId: 'createConnectorButton',
      };
    }

    return menuConfig;
  }, [
    activeSection,
    docLinks.links.alerting.actionTypes,
    isProjectChrome,
    onCreateConnectorClick,
    onSectionChange,
    showCreateConnectorInMenu,
  ]);

  if (!isProjectChrome || !config) {
    return null;
  }

  return <AppMenu config={config} setAppMenu={chrome.setAppMenu} />;
};

ManagementConnectorsHomeAppMenu.displayName = 'ManagementConnectorsHomeAppMenu';
