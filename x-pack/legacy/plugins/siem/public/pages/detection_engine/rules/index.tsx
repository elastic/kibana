/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';

import { DETECTION_ENGINE_PAGE_NAME } from '../../../components/link_to/redirect_to_detection_engine';
import { FormattedRelativePreferenceDate } from '../../../components/formatted_date';
import { getEmptyTagValue } from '../../../components/empty_value';
import { HeaderPage } from '../../../components/header_page';
import { WrapperPage } from '../../../components/wrapper_page';
import { SpyRoute } from '../../../utils/route/spy_routes';

import { AllRules } from './all';
import { ImportRuleModal } from './components/import_rule_modal';
import { ReadOnlyCallOut } from './components/read_only_callout';
import { useUserInfo } from '../components/user_info';
import * as i18n from './translations';

export const RulesComponent = React.memo(() => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCompleteToggle, setImportCompleteToggle] = useState(false);
  const {
    loading,
    isSignalIndexExists,
    isAuthenticated,
    canUserCRUD,
    hasManageApiKey,
  } = useUserInfo();

  if (
    isSignalIndexExists != null &&
    isAuthenticated != null &&
    (!isSignalIndexExists || !isAuthenticated)
  ) {
    return <Redirect to={`/${DETECTION_ENGINE_PAGE_NAME}`} />;
  }
  const userHasNoPermissions =
    canUserCRUD != null && hasManageApiKey != null ? !canUserCRUD || !hasManageApiKey : false;
  const lastCompletedRun = undefined;
  return (
    <>
      {userHasNoPermissions && <ReadOnlyCallOut />}
      <ImportRuleModal
        showModal={showImportModal}
        closeModal={() => setShowImportModal(false)}
        importComplete={() => setImportCompleteToggle(!importCompleteToggle)}
      />
      <WrapperPage>
        <HeaderPage
          backOptions={{
            href: `#${DETECTION_ENGINE_PAGE_NAME}`,
            text: i18n.BACK_TO_DETECTION_ENGINE,
          }}
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
                isDisabled={userHasNoPermissions || loading}
                onClick={() => {
                  setShowImportModal(true);
                }}
              >
                {i18n.IMPORT_RULE}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                href={`#${DETECTION_ENGINE_PAGE_NAME}/rules/create`}
                iconType="plusInCircle"
                isDisabled={userHasNoPermissions || loading}
              >
                {i18n.ADD_NEW_RULE}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </HeaderPage>
        <AllRules
          loading={loading}
          hasNoPermissions={userHasNoPermissions}
          importCompleteToggle={importCompleteToggle}
        />
      </WrapperPage>

      <SpyRoute />
    </>
  );
});

RulesComponent.displayName = 'RulesComponent';
