/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  deleteRules,
  duplicateRule,
  enableRules,
} from '../../../../containers/detection_engine/rules/api';
import { Action } from './reducer';
import { Rule } from '../../../../containers/detection_engine/rules/types';

export const editRuleAction = () => {};

export const runRuleAction = () => {};

export const duplicateRuleAction = async (
  rule: Rule,
  dispatch: React.Dispatch<Action>,
  kbnVersion: string
) => {
  dispatch({ type: 'updateLoading', ruleIds: [rule.rule_id], isLoading: true });
  const duplicatedRule = await duplicateRule({ rule, kbnVersion });
  dispatch({ type: 'updateLoading', ruleIds: [rule.rule_id], isLoading: false });
  dispatch({ type: 'updateRules', rules: [duplicatedRule] });
};

export const exportRulesAction = async (ruleIds: string[], dispatch: React.Dispatch<Action>) => {};

export const deleteRulesAction = async (
  ruleIds: string[],
  dispatch: React.Dispatch<Action>,
  kbnVersion: string
) => {
  dispatch({ type: 'updateLoading', ruleIds, isLoading: true });
  const deletedRules = await deleteRules({ ruleIds, kbnVersion });
  dispatch({ type: 'deleteRules', rules: deletedRules });
};

export const enableRulesAction = async (
  ruleIds: string[],
  enabled: boolean,
  dispatch: React.Dispatch<Action>,
  kbnVersion: string
) => {
  try {
    dispatch({ type: 'updateLoading', ruleIds, isLoading: true });
    const updatedRules = await enableRules({ ruleIds, enabled, kbnVersion });
    dispatch({ type: 'updateRules', rules: updatedRules });
  } catch {
    dispatch({ type: 'updateLoading', ruleIds, isLoading: false });
  }
};
