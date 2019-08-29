/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, useEffect } from 'react';
import {
  EuiFlyoutHeader,
  EuiTitle,
  EuiSpacer,
  EuiTabs,
  EuiFlyoutBody,
  EuiTab,
  EuiOutsideClickDetector,
} from '@elastic/eui';
import * as Rx from 'rxjs';
import { AdvancedSettingsForm } from './advanced_settings_form';
import { BlacklistForm } from './blacklist_form';
import { DrilldownsForm } from './drilldowns_form';
import { WorkspaceNode, AdvancedSettings, UrlTemplate, Field } from '../../types';

const tabs = [
  {
    title: i18n.translate('xpack.graph.settings.advancedSettingsTitle', {
      defaultMessage: 'Advanced settings',
    }),
    component: AdvancedSettingsForm,
  },
  {
    title: i18n.translate('xpack.graph.settings.blacklistTitle', { defaultMessage: 'Blacklist' }),
    component: BlacklistForm,
  },
  {
    title: i18n.translate('xpack.graph.settings.drillDownsTitle', {
      defaultMessage: 'Drill-downs',
    }),
    component: DrilldownsForm,
  },
];

export interface GraphSettingsProps {
  advancedSettings: AdvancedSettings;
  updateAdvancedSettings: (advancedSettings: AdvancedSettings) => void;
  blacklistedNodes: WorkspaceNode[];
  unblacklistNode: (node: WorkspaceNode) => void;
  urlTemplates: UrlTemplate[];
  removeUrlTemplate: (urlTemplate: UrlTemplate) => void;
  saveUrlTemplate: (urlTemplate: UrlTemplate) => void;
  allFields: Field[];
}

interface AsObservable<P> {
  observable: Readonly<Rx.Observable<P>>;
}

export function GraphSettings({
  observable,
  onLeave,
}: AsObservable<GraphSettingsProps> & { onLeave: () => void }) {
  const [currentProps, setCurrentProps] = useState<GraphSettingsProps | undefined>(undefined);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    observable.subscribe(setCurrentProps);
  }, [observable]);

  if (!currentProps) return null;

  const ActiveTabContent = tabs[activeTab].component;
  return (
    <EuiOutsideClickDetector onOutsideClick={onLeave}>
      <div>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id="flyoutComplicatedTitle">Settings</h2>
          </EuiTitle>
          <EuiTabs style={{ marginBottom: '-25px' }}>
            {tabs.map(({ title }, index) => (
              <EuiTab
                key={title}
                isSelected={activeTab === index}
                onClick={() => setActiveTab(index)}
              >
                {title}
              </EuiTab>
            ))}
          </EuiTabs>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiSpacer size="m" />
          <ActiveTabContent {...currentProps} />
        </EuiFlyoutBody>
      </div>
    </EuiOutsideClickDetector>
  );
}
