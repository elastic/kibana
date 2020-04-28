/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useHistory, useParams } from 'react-router-dom';
import { EuiTabs, EuiTab, EuiSpacer } from '@elastic/eui';
import { SiemPageName } from '../../pages/home/types';
import * as i18n from './translations';

const tabs: Array<{ id: 'default' | 'template'; name: string; disabled: boolean; href: string }> = [
  {
    id: 'default',
    name: i18n.TAB_TIMELINES,
    href: `#/${SiemPageName.timelines}/default`,
    disabled: false,
  },
  {
    id: 'template',
    name: i18n.TAB_TEMPLATES,
    href: `#/${SiemPageName.timelines}/template`,
    disabled: false,
  },
];

export const useTimelineTabs = (
  type: 'tab' | 'filter'
): { timelineType: 'default' | 'template'; timelineTypeActions: JSX.Element } => {
  const [timelineTypes, setTimelineTypes] = useState<'default' | 'template'>('default');

  const history = useHistory();
  const handleTabClicked = useCallback(() => {
    setTimelineTypes(tab.id);
    if (enableRouting) {
      history.push(`/${SiemPageName.timelines}/${tab.id}`);
    }
  }, [setTimelineTypes, tab]);

  const timelineTypeActions = useMemo(() => {
    return (
      type === 'tab' && (
        <>
          <EuiTabs>
            {tabs.map((tab, index) => (
              <EuiTab
                isSelected={tab.id === timelineTypes}
                disabled={tab.disabled}
                key={index}
                href=""
              >
                {tab.name}
              </EuiTab>
            ))}
          </EuiTabs>
          <EuiSpacer size="m" />
        </>
      )
    );
  }, [tabs, timelineTypes, type, history]);

  return { timelineTypes, timelineTypeActions };
};
