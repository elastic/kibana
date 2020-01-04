/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import { FormattedRelativePreferenceDate } from '../../../components/formatted_date';
import { getEmptyTagValue } from '../../../components/empty_value';
import { HeaderPage } from '../../../components/header_page';
import { WrapperPage } from '../../../components/wrapper_page';
import { SpyRoute } from '../../../utils/route/spy_routes';

import { AllRules } from './all';
import { ImportRuleModal } from './components/import_rule_modal';
import * as i18n from './translations';

export const RulesComponent = React.memo(() => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCompleteToggle, setImportCompleteToggle] = useState(false);

  const lastCompletedRun = undefined;
  return (
    <>
      <ImportRuleModal
        showModal={showImportModal}
        closeModal={() => setShowImportModal(false)}
        importComplete={() => setImportCompleteToggle(!importCompleteToggle)}
      />
      <WrapperPage>
        <HeaderPage
          backOptions={{ href: '#detection-engine', text: i18n.BACK_TO_DETECTION_ENGINE }}
          subtitle={
            lastCompletedRun ? (
              <FormattedMessage
                id="xpack.siem.headerPage.rules.pageSubtitle"
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
              <EuiButton fill href="#/detection-engine/rules/create" iconType="plusInCircle">
                {i18n.ADD_NEW_RULE}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </HeaderPage>

        <AllRules importCompleteToggle={importCompleteToggle} />
      </WrapperPage>

      <SpyRoute />
    </>
  );
});

RulesComponent.displayName = 'RulesComponent';
