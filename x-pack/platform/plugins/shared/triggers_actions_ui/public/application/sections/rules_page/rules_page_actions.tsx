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
import { routeToSettings } from '../../constants';

export interface RulesPageActions {
  openCreateRuleModal: () => void;
  navigateToSettings: () => void;
  navigateToCreateRuleForm: (ruleTypeId: string) => void;
  navigateToCreateRuleFromTemplateForm: (templateId: string) => void;
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
    showClassicBadge,
  } = useKibana().services;

  const [isRuleTypeModalVisible, setIsRuleTypeModalVisible] = useState(false);

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
  const navigateToSettings = useCallback(() => {
    const { pathname, search, hash } = locationRef.current;
    const returnPath = `${pathname}${search}${hash}` || '/';
    history.push({ pathname: routeToSettings, state: { returnPath } });
  }, [history]);

  const actions = useMemo<RulesPageActions>(
    () => ({
      openCreateRuleModal,
      navigateToSettings,
      navigateToCreateRuleForm,
      navigateToCreateRuleFromTemplateForm,
      navigateToEditRuleForm,
    }),
    [
      openCreateRuleModal,
      navigateToSettings,
      navigateToCreateRuleForm,
      navigateToCreateRuleFromTemplateForm,
      navigateToEditRuleForm,
    ]
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
          showClassicBadge={showClassicBadge}
        />
      )}
    </RulesPageActionsContext.Provider>
  );
};
