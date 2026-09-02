/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  getCreateRuleFromTemplateRoute,
  getCreateRuleRoute,
  getEditRuleRoute,
} from '@kbn/rule-data-utils';
import { RuleTypeModal } from '@kbn/response-ops-rule-form';
import { useKibana } from '../../../common/lib/kibana';
import { RulesSettingsFlyout } from '../../components/rules_setting/rules_settings_flyout';

const ALERT_DELETE_CATEGORY_IDS = ['management', 'observability', 'securitySolution'] as const;

export interface RulesPageActions {
  openCreateRuleModal: () => void;
  openSettingsFlyout: () => void;
  navigateToCreateRuleForm: (ruleTypeId: string) => void;
  navigateToEditRuleForm: (ruleId: string) => void;
}

const RulesPageActionsContext = createContext<RulesPageActions | null>(null);

export const useRulesPageActions = (): RulesPageActions => {
  const context = useContext(RulesPageActionsContext);
  if (!context) {
    throw new Error('useRulesPageActions must be used within a RulesPageActionsProvider');
  }
  return context;
};

export const RulesPageActionsProvider = ({ children }: PropsWithChildren) => {
  const history = useHistory();
  const location = useLocation();
  const {
    http,
    notifications: { toasts },
    ruleTypeRegistry,
    cps,
  } = useKibana().services;

  const [isRuleTypeModalVisible, setIsRuleTypeModalVisible] = useState(false);
  const [isSettingsFlyoutVisible, setIsSettingsFlyoutVisible] = useState(false);

  // Track the latest location without re-creating navigation callbacks on every
  // search/hash change; updating ref.current in render does not trigger renders.
  const locationRef = useRef(location);
  locationRef.current = location;

  const navigateToRuleForm = useCallback(
    (destinationPathname: string) => {
      const { pathname, search, hash } = locationRef.current;
      const returnPath = `${pathname}${search}${hash}` || '/';
      history.push({
        pathname: destinationPathname,
        search,
        hash,
        state: { returnPath },
      });
    },
    [history]
  );

  const navigateToEditRuleForm = useCallback(
    (ruleId: string) => navigateToRuleForm(getEditRuleRoute(ruleId)),
    [navigateToRuleForm]
  );

  const navigateToCreateRuleForm = useCallback(
    (ruleTypeId: string) => navigateToRuleForm(getCreateRuleRoute(ruleTypeId)),
    [navigateToRuleForm]
  );

  const navigateToCreateRuleFromTemplateForm = useCallback(
    (templateId: string) => navigateToRuleForm(getCreateRuleFromTemplateRoute(templateId)),
    [navigateToRuleForm]
  );

  const openCreateRuleModal = useCallback(() => setIsRuleTypeModalVisible(true), []);
  const openSettingsFlyout = useCallback(() => setIsSettingsFlyoutVisible(true), []);

  const actions = useMemo<RulesPageActions>(
    () => ({
      openCreateRuleModal,
      openSettingsFlyout,
      navigateToCreateRuleForm,
      navigateToEditRuleForm,
    }),
    [openCreateRuleModal, openSettingsFlyout, navigateToCreateRuleForm, navigateToEditRuleForm]
  );

  return (
    <RulesPageActionsContext.Provider value={actions}>
      {children}
      {isRuleTypeModalVisible && (
        <RuleTypeModal
          onClose={() => setIsRuleTypeModalVisible(false)}
          onSelectRuleType={navigateToCreateRuleForm}
          onSelectTemplate={navigateToCreateRuleFromTemplateForm}
          http={http}
          toasts={toasts}
          registeredRuleTypes={ruleTypeRegistry.list()}
          filteredRuleTypes={[]}
          cps={cps}
        />
      )}
      <RulesSettingsFlyout
        isVisible={isSettingsFlyoutVisible}
        onClose={() => setIsSettingsFlyoutVisible(false)}
        alertDeleteCategoryIds={[...ALERT_DELETE_CATEGORY_IDS]}
      />
    </RulesPageActionsContext.Provider>
  );
};
