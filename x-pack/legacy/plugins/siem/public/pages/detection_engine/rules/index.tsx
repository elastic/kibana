/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback, useRef, useState } from 'react';
import { Redirect } from 'react-router-dom';

import { usePrePackagedRules } from '../../../containers/detection_engine/rules';
import {
  DETECTION_ENGINE_PAGE_NAME,
  getDetectionEngineUrl,
  getCreateRuleUrl,
} from '../../../components/link_to/redirect_to_detection_engine';
import { DetectionEngineHeaderPage } from '../components/detection_engine_header_page';
import { WrapperPage } from '../../../components/wrapper_page';
import { SpyRoute } from '../../../utils/route/spy_routes';

import { useUserInfo } from '../components/user_info';
import { AllRules } from './all';
import { ImportRuleModal } from './components/import_rule_modal';
import { ReadOnlyCallOut } from './components/read_only_callout';
import { UpdatePrePackagedRulesCallOut } from './components/pre_packaged_rules/update_callout';
import { getPrePackagedRuleStatus, redirectToDetections } from './helpers';
import * as i18n from './translations';

type Func = (refreshPrePackagedRule?: boolean) => void;

const RulesPageComponent: React.FC = () => {
  const [showImportModal, setShowImportModal] = useState(false);
  const refreshRulesData = useRef<null | Func>(null);
  const {
    loading,
    isSignalIndexExists,
    isAuthenticated,
    hasEncryptionKey,
    canUserCRUD,
    hasIndexWrite,
    hasManageApiKey,
  } = useUserInfo();
  const {
    createPrePackagedRules,
    loading: prePackagedRuleLoading,
    loadingCreatePrePackagedRules,
    refetchPrePackagedRulesStatus,
    rulesCustomInstalled,
    rulesInstalled,
    rulesNotInstalled,
    rulesNotUpdated,
  } = usePrePackagedRules({
    canUserCRUD,
    hasIndexWrite,
    hasManageApiKey,
    isSignalIndexExists,
    isAuthenticated,
    hasEncryptionKey,
  });
  const prePackagedRuleStatus = getPrePackagedRuleStatus(
    rulesInstalled,
    rulesNotInstalled,
    rulesNotUpdated
  );

  const userHasNoPermissions =
    canUserCRUD != null && hasManageApiKey != null ? !canUserCRUD || !hasManageApiKey : false;

  const handleRefreshRules = useCallback(async () => {
    if (refreshRulesData.current != null) {
      refreshRulesData.current(true);
    }
  }, [refreshRulesData]);

  const handleCreatePrePackagedRules = useCallback(async () => {
    if (createPrePackagedRules != null) {
      await createPrePackagedRules();
      handleRefreshRules();
    }
  }, [createPrePackagedRules, handleRefreshRules]);

  const handleRefetchPrePackagedRulesStatus = useCallback(() => {
    if (refetchPrePackagedRulesStatus != null) {
      refetchPrePackagedRulesStatus();
    }
  }, [refetchPrePackagedRulesStatus]);

  const handleSetRefreshRulesData = useCallback((refreshRule: Func) => {
    refreshRulesData.current = refreshRule;
  }, []);

  if (redirectToDetections(isSignalIndexExists, isAuthenticated, hasEncryptionKey)) {
    return <Redirect to={`/${DETECTION_ENGINE_PAGE_NAME}`} />;
  }

  return (
    <>
      {userHasNoPermissions && <ReadOnlyCallOut />}
      <ImportRuleModal
        showModal={showImportModal}
        closeModal={() => setShowImportModal(false)}
        importComplete={handleRefreshRules}
      />
      <WrapperPage>
        <DetectionEngineHeaderPage
          backOptions={{
            href: getDetectionEngineUrl(),
            text: i18n.BACK_TO_DETECTION_ENGINE,
          }}
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
                href={getCreateRuleUrl()}
                iconType="plusInCircle"
                isDisabled={userHasNoPermissions || loading}
              >
                {i18n.ADD_NEW_RULE}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </DetectionEngineHeaderPage>
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
          refetchPrePackagedRulesStatus={handleRefetchPrePackagedRulesStatus}
          rulesCustomInstalled={rulesCustomInstalled}
          rulesInstalled={rulesInstalled}
          rulesNotInstalled={rulesNotInstalled}
          rulesNotUpdated={rulesNotUpdated}
          setRefreshRulesData={handleSetRefreshRulesData}
        />
      </WrapperPage>

      <SpyRoute />
    </>
  );
};

export const RulesPage = React.memo(RulesPageComponent);
