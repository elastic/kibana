/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { EuiFlexGroup, EuiSpacer, EuiKeyPadMenuItem, EuiIcon } from '@elastic/eui';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ActionTypeIndex } from '../../../../../../../plugins/triggers_actions_ui/public/types';
import * as i18nCommon from '../../common/translations';
import { EmptyPage } from '../../../components/empty_page';
import { useKibana } from '../../../lib/kibana';

const OverviewEmptyComponent: React.FC = () => {
  const { http, docLinks, triggers_actions_ui } = useKibana().services;
  const basePath = http.basePath.get();
  const actionTypeRegistry = triggers_actions_ui.actionTypeRegistry;
  const [actionTypesIndex, setActionTypesIndex] = useState<ActionTypeIndex | undefined>(undefined);

  // load action types
  useEffect(() => {
    (async () => {
      // here shoud be a call for actions server API to get a list of action types
      // const actionTypes = await loadActionTypes({ http });

      // hardcoded for example
      const actionTypes = [
        { id: '.email', name: 'Email', enabled: true },
        { id: '.index', name: 'Index', enabled: true },
        { id: '.pagerduty', name: 'PagerDuty', enabled: true },
        { id: '.server-log', name: 'Server log', enabled: true },
        { id: '.servicenow', name: 'servicenow', enabled: true },
        { id: '.slack', name: 'Slack', enabled: true },
        { id: '.webhook', name: 'Webhook', enabled: true },
        { id: '.example-action', name: 'Example Action', enabled: true },
      ];
      const index: ActionTypeIndex = {};
      for (const actionTypeItem of actionTypes) {
        index[actionTypeItem.id] = actionTypeItem;
      }
      setActionTypesIndex(index);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const actionTypeNodes = actionTypeRegistry.list().map(function(item, index) {
    return (
      <EuiKeyPadMenuItem
        key={index}
        data-test-subj={`${item.id}-ActionTypeSelectOption`}
        label={actionTypesIndex ? actionTypesIndex[item.id].name : item.id}
        onClick={() => alert('new action type was added')}
      >
        <EuiIcon size="xl" type={item.iconClass} />
      </EuiKeyPadMenuItem>
    );
  });

  return (
    <>
      <EmptyPage
        actionPrimaryIcon="gear"
        actionPrimaryLabel={i18nCommon.EMPTY_ACTION_PRIMARY}
        actionPrimaryUrl={`${basePath}/app/kibana#/home/tutorial_directory/siem`}
        actionSecondaryIcon="popout"
        actionSecondaryLabel={i18nCommon.EMPTY_ACTION_SECONDARY}
        actionSecondaryTarget="_blank"
        actionSecondaryUrl={docLinks.links.siem.gettingStarted}
        data-test-subj="empty-page"
        message={i18nCommon.EMPTY_MESSAGE}
        title={i18nCommon.EMPTY_TITLE}
      />
      <EuiSpacer size="xl" />
      <EuiFlexGroup gutterSize="s" wrap>
        {actionTypeNodes}
      </EuiFlexGroup>
    </>
  );
};

OverviewEmptyComponent.displayName = 'OverviewEmptyComponent';

export const OverviewEmpty = React.memo(OverviewEmptyComponent);
