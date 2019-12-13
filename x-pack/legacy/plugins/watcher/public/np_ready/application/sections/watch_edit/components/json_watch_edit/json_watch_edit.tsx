/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useState } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageContent,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ExecuteDetails } from 'plugins/watcher/np_ready/application/models/execute_details/execute_details';
import { getActionType } from '../../../../../../../common/lib/get_action_type';
import { BaseWatch, ExecutedWatchDetails } from '../../../../../../../common/types/watch_types';
import { ACTION_MODES, TIME_UNITS } from '../../../../../../../common/constants';
import { JsonWatchEditForm } from './json_watch_edit_form';
import { JsonWatchEditSimulate } from './json_watch_edit_simulate';
import { WatchContext } from '../../watch_context';

interface WatchAction {
  actionId: string;
  actionMode: string;
  type: string;
}

interface WatchTab {
  id: string;
  name: string;
}

const WATCH_EDIT_TAB = 'watchEditTab';
const WATCH_SIMULATE_TAB = 'watchSimulateTab';

const WATCH_TABS: WatchTab[] = [
  {
    id: WATCH_EDIT_TAB,
    name: i18n.translate('xpack.watcher.sections.watchEdit.json.editTabLabel', {
      defaultMessage: 'Edit',
    }),
  },
  {
    id: WATCH_SIMULATE_TAB,
    name: i18n.translate('xpack.watcher.sections.watchEdit.json.simulateTabLabel', {
      defaultMessage: 'Simulate',
    }),
  },
];

const EXECUTE_DETAILS_INITIAL_STATE = {
  triggeredTimeValue: 0,
  triggeredTimeUnit: TIME_UNITS.SECOND,
  scheduledTimeValue: 0,
  scheduledTimeUnit: TIME_UNITS.SECOND,
  ignoreCondition: false,
};

function getActions(watch: BaseWatch) {
  const actions = (watch.watch && watch.watch.actions) || {};
  return Object.keys(actions).map(actionKey => ({
    actionId: actionKey,
    type: getActionType(actions[actionKey]),
    actionMode: ACTION_MODES.SIMULATE,
  }));
}

function getActionModes(items: WatchAction[]) {
  const result = items.reduce((itemsAccum: any, item) => {
    if (item.actionId) {
      itemsAccum[item && item.actionId] = item.actionMode;
    }
    return itemsAccum;
  }, {});
  return result;
}

export const JsonWatchEdit = ({ pageTitle }: { pageTitle: string }) => {
  const { watch } = useContext(WatchContext);
  const watchActions = getActions(watch);
  // hooks
  const [selectedTab, setSelectedTab] = useState<string>(WATCH_EDIT_TAB);
  const [executeDetails, setExecuteDetails] = useState(
    new ExecuteDetails({
      ...EXECUTE_DETAILS_INITIAL_STATE,
      actionModes: getActionModes(watchActions),
    })
  );
  const executeWatchErrors = executeDetails.validate();
  const hasExecuteWatchErrors = !!Object.keys(executeWatchErrors).find(
    errorKey => executeWatchErrors[errorKey].length >= 1
  );
  return (
    <EuiPageContent>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h1 data-test-subj="pageTitle">{pageTitle}</h1>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiTabs>
        {WATCH_TABS.map((tab, index) => (
          <EuiTab
            onClick={() => {
              setSelectedTab(tab.id);
              setExecuteDetails(
                new ExecuteDetails({
                  ...executeDetails,
                  actionModes: getActionModes(watchActions),
                })
              );
            }}
            isSelected={tab.id === selectedTab}
            key={index}
            data-test-subj="tab"
          >
            {tab.name}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="l" />
      {selectedTab === WATCH_SIMULATE_TAB && (
        <JsonWatchEditSimulate
          executeDetails={executeDetails}
          setExecuteDetails={(details: ExecutedWatchDetails) => setExecuteDetails(details)}
          executeWatchErrors={executeWatchErrors}
          hasExecuteWatchErrors={hasExecuteWatchErrors}
          watchActions={watchActions}
        />
      )}
      {selectedTab === WATCH_EDIT_TAB && <JsonWatchEditForm />}
    </EuiPageContent>
  );
};
