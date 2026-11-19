/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiTab, EuiTabs, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EditConnectorTabs } from '../../../types';

const TAB_LABELS = {
  [EditConnectorTabs.Configuration]: i18n.translate(
    'xpack.triggersActionsUI.sections.editConnectorForm.tabText',
    { defaultMessage: 'Configuration' }
  ),
  [EditConnectorTabs.Access]: i18n.translate(
    'xpack.triggersActionsUI.sections.editConnectorForm.accessTabText',
    { defaultMessage: 'Access' }
  ),
  [EditConnectorTabs.Rules]: i18n.translate(
    'xpack.triggersActionsUI.sections.rulesConnectorList.tabText',
    { defaultMessage: 'Rules' }
  ),
  [EditConnectorTabs.Test]: i18n.translate(
    'xpack.triggersActionsUI.sections.testConnectorForm.tabText',
    { defaultMessage: 'Test' }
  ),
};

const TAB_TEST_SUBJECTS = {
  [EditConnectorTabs.Configuration]: 'configureConnectorTab',
  [EditConnectorTabs.Access]: 'accessConnectorTab',
  [EditConnectorTabs.Rules]: 'rulesConnectorTab',
  [EditConnectorTabs.Test]: 'testConnectorTab',
};

export interface ConnectorFormTabsProps {
  tabs: readonly EditConnectorTabs[];
  selectedTab: EditConnectorTabs;
  setTab: (tab: EditConnectorTabs) => void;
}

export const ConnectorFormTabs = ({
  tabs,
  selectedTab,
  setTab,
}: ConnectorFormTabsProps): JSX.Element => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiTabs
      className="connectorEditFlyoutTabs"
      bottomBorder={false}
      css={css`
        margin-bottom: -${euiTheme.size.l};
      `}
    >
      {tabs.map((tab) => (
        <EuiTab
          key={tab}
          onClick={() => setTab(tab)}
          data-test-subj={TAB_TEST_SUBJECTS[tab]}
          isSelected={tab === selectedTab}
        >
          {TAB_LABELS[tab]}
        </EuiTab>
      ))}
    </EuiTabs>
  );
};
