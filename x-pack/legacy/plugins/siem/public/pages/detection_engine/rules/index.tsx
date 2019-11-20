/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiTabbedContent } from '@elastic/eui';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import uuid from 'uuid';
import { HeaderPage } from '../../../components/header_page';

import { WrapperPage } from '../../../components/wrapper_page';
import { SpyRoute } from '../../../utils/route/spy_routes';
import * as i18n from './translations';
import { AllRules } from './all_rules';
import { ActivityMonitor } from './activity_monitor';
import { FormattedRelativePreferenceDate } from '../../../components/formatted_date';
import { getEmptyTagValue } from '../../../components/empty_value';
import { ImportRuleModal } from './components/import_rule_modal';
import { useStateToaster } from '../../../components/toasters';

export const RulesComponent = React.memo(() => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [, dispatchToaster] = useStateToaster();

  const lastCompletedRun = undefined;
  return (
    <>
      <ImportRuleModal
        showModal={showImportModal}
        closeModal={() => setShowImportModal(false)}
        importComplete={importedRules => {
          dispatchToaster({
            type: 'addToaster',
            toast: {
              id: uuid.v4(),
              title: i18n.SUCCESSFULLY_IMPORTED_RULES(importedRules.length),
              color: 'success',
              iconType: 'check',
            },
          });
        }}
      />
      <WrapperPage>
        <HeaderPage
          backOptions={{ href: '#detection-engine', text: i18n.BACK_TO_DETECTION_ENGINE }}
          subtitle={
            lastCompletedRun ? (
              <FormattedMessage
                id="xpack.siem.headerPage.pageSubtitle"
                defaultMessage="Last completed run: {lastCompletedRun}"
                values={{
                  lastCompletedRun: <FormattedRelativePreferenceDate value={lastCompletedRun} />,
                }}
              />
            ) : (
              getEmptyTagValue()
            )
          }
          title={i18n.PAGE_TITLE}
        >
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="importAction"
                onClick={() => {
                  setShowImportModal(true);
                }}
              >
                {i18n.IMPORT_RULE}
              </EuiButton>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButton fill href="#/detection-engine/rules/create-rule" iconType="plusInCircle">
                {i18n.ADD_NEW_RULE}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </HeaderPage>

        <EuiTabbedContent
          tabs={[
            {
              id: 'tabAllRules',
              name: i18n.ALL_RULES,
              content: <AllRules />,
            },
            {
              id: 'tabActivityMonitor',
              name: i18n.ACTIVITY_MONITOR,
              content: <ActivityMonitor />,
            },
          ]}
        />
      </WrapperPage>

      <SpyRoute />
    </>
  );
});

RulesComponent.displayName = 'RulesComponent';
