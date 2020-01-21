/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useCallback, useRef, useState } from 'react';
import { Redirect } from 'react-router-dom';

import { usePrePackagedRules } from '../../../containers/detection_engine/rules';
import { DETECTION_ENGINE_PAGE_NAME } from '../../../components/link_to/redirect_to_detection_engine';
import { FormattedRelativePreferenceDate } from '../../../components/formatted_date';
import { getEmptyTagValue } from '../../../components/empty_value';
import { HeaderPage } from '../../../components/header_page';
import { WrapperPage } from '../../../components/wrapper_page';
import { SpyRoute } from '../../../utils/route/spy_routes';
import { useUserInfo } from '../components/user_info';
import { AllRules } from './all';
import { ImportRuleModal } from './components/import_rule_modal';
import { ReadOnlyCallOut } from './components/read_only_callout';
import { UpdatePrePackagedRulesCallOut } from './components/pre_packaged_rules/update_callout';
import { getPrePackagedRuleStatus } from './helpers';
import * as i18n from './translations';

type Func = () => void;

export const RulesComponent = React.memo(() => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCompleteToggle, setImportCompleteToggle] = useState(false);
  const refreshRulesData = useRef<null | Func>(null);
  const {
    loading,
    isSignalIndexExists,
    isAuthenticated,
    canUserCRUD,
    hasIndexManage,
    hasManageApiKey,
  } = useUserInfo();
  const {
    createPrePackagedRules,
    loading: prePackagedRuleLoading,
    loadingCreatePrePackagedRules,
    refetchPrePackagedRulesStatus,
    rulesInstalled,
    rulesNotInstalled,
    rulesNotUpdated,
  } = usePrePackagedRules({
    canUserCRUD,
    hasIndexManage,
    hasManageApiKey,
    isSignalIndexExists,
    isAuthenticated,
  });
  const prePackagedRuleStatus = getPrePackagedRuleStatus(
    rulesInstalled,
    rulesNotInstalled,
    rulesNotUpdated
  );

  const userHasNoPermissions =
    canUserCRUD != null && hasManageApiKey != null ? !canUserCRUD || !hasManageApiKey : false;
  const lastCompletedRun = undefined;

  const handleCreatePrePackagedRules = useCallback(async () => {
    if (createPrePackagedRules != null) {
      await createPrePackagedRules();
      if (refreshRulesData.current != null) {
        refreshRulesData.current();
      }
    }
  }, [createPrePackagedRules, refreshRulesData]);

  const handleRefetchPrePackagedRulesStatus = useCallback(() => {
    if (refetchPrePackagedRulesStatus != null) {
      refetchPrePackagedRulesStatus();
    }
  }, [refetchPrePackagedRulesStatus]);

  const handleSetRefreshRulesData = useCallback((refreshRule: Func) => {
    refreshRulesData.current = refreshRule;
  }, []);

  if (
    isSignalIndexExists != null &&
    isAuthenticated != null &&
    (!isSignalIndexExists || !isAuthenticated)
  ) {
    return <Redirect to={`/${DETECTION_ENGINE_PAGE_NAME}`} />;
  }

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
            {prePackagedRuleStatus === 'ruleNotInstalled' && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  iconType="indexOpen"
                  isLoading={loadingCreatePrePackagedRules}
                  isDisabled={userHasNoPermissions || loading}
                  onClick={handleCreatePrePackagedRules}
                >
                  {i18n.LOAD_PREPACKAGED_RULES}
                </EuiButton>
              </EuiFlexItem>
            )}
            {prePackagedRuleStatus === 'someRuleUninstall' && (
              <EuiFlexItem grow={false}>
                <EuiButton
                  iconType="plusInCircle"
                  isLoading={loadingCreatePrePackagedRules}
                  isDisabled={userHasNoPermissions || loading}
                  onClick={handleCreatePrePackagedRules}
                >
                  {i18n.RELOAD_MISSING_PREPACKAGED_RULES(rulesNotInstalled ?? 0)}
                </EuiButton>
              </EuiFlexItem>
            )}
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
        {prePackagedRuleStatus === 'ruleNeedUpdate' && (
          <UpdatePrePackagedRulesCallOut
            loading={loadingCreatePrePackagedRules}
            numberOfUpdatedRules={rulesNotUpdated ?? 0}
            updateRules={handleCreatePrePackagedRules}
          />
        )}
        <AllRules
          createPrePackagedRules={createPrePackagedRules}
          loading={loading || prePackagedRuleLoading}
          loadingCreatePrePackagedRules={loadingCreatePrePackagedRules}
          hasNoPermissions={userHasNoPermissions}
          importCompleteToggle={importCompleteToggle}
          refetchPrePackagedRulesStatus={handleRefetchPrePackagedRulesStatus}
          rulesInstalled={rulesInstalled}
          rulesNotInstalled={rulesNotInstalled}
          rulesNotUpdated={rulesNotUpdated}
          setRefreshRulesData={handleSetRefreshRulesData}
        />
      </WrapperPage>

      <SpyRoute />
    </>
  );
});

RulesComponent.displayName = 'RulesComponent';
