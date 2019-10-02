/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, useEffect } from 'react';
import { EuiFlyoutHeader, EuiTitle, EuiTabs, EuiFlyoutBody, EuiTab } from '@elastic/eui';
import * as Rx from 'rxjs';
import { AdvancedSettingsForm } from './advanced_settings_form';
import { BlacklistForm } from './blacklist_form';
import { UrlTemplateList } from './url_template_list';
import { WorkspaceNode, AdvancedSettings, UrlTemplate, WorkspaceField } from '../../types';

const tabs = [
  {
    id: 'advancedSettings',
    title: i18n.translate('xpack.graph.settings.advancedSettingsTitle', {
      defaultMessage: 'Advanced settings',
    }),
    component: AdvancedSettingsForm,
  },
  {
    id: 'blacklist',
    title: i18n.translate('xpack.graph.settings.blacklistTitle', { defaultMessage: 'Blacklist' }),
    component: BlacklistForm,
  },
  {
    id: 'drillDowns',
    title: i18n.translate('xpack.graph.settings.drillDownsTitle', {
      defaultMessage: 'Drill-downs',
    }),
    component: UrlTemplateList,
  },
];

export interface SettingsProps {
  advancedSettings: AdvancedSettings;
  updateAdvancedSettings: (advancedSettings: AdvancedSettings) => void;
  blacklistedNodes?: WorkspaceNode[];
  unblacklistNode?: (node: WorkspaceNode) => void;
  urlTemplates: UrlTemplate[];
  removeUrlTemplate: (urlTemplate: UrlTemplate) => void;
  saveUrlTemplate: (index: number, urlTemplate: UrlTemplate) => void;
  allFields: WorkspaceField[];
  canEditDrillDownUrls: boolean;
}

interface AsObservable<P> {
  observable: Readonly<Rx.Observable<P>>;
}

export function Settings({ observable }: AsObservable<SettingsProps>) {
  const [currentProps, setCurrentProps] = useState<SettingsProps | undefined>(undefined);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    observable.subscribe(setCurrentProps);
  }, [observable]);

  if (!currentProps) return null;

  const ActiveTabContent = tabs[activeTab].component;
  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{i18n.translate('xpack.graph.settings.title', { defaultMessage: 'Settings' })}</h2>
        </EuiTitle>
        <EuiTabs style={{ margin: '0 -16px -25px' }}>
          {tabs
            .filter(({ id }) => id !== 'drillDowns' || currentProps.canEditDrillDownUrls)
            .map(({ title }, index) => (
              <EuiTab
                key={title}
                isSelected={activeTab === index}
                onClick={() => {
                  setActiveTab(index);
                }}
              >
                {title}
              </EuiTab>
            ))}
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <ActiveTabContent {...currentProps} />
      </EuiFlyoutBody>
    </>
  );
}
