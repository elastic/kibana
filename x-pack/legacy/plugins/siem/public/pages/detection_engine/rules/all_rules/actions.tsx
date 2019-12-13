/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  deleteRules,
  duplicateRules,
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
  dispatch({ type: 'updateLoading', ids: [rule.id], isLoading: true });
  const duplicatedRule = await duplicateRules({ rules: [rule], kbnVersion });
  dispatch({ type: 'updateLoading', ids: [rule.id], isLoading: false });
  dispatch({ type: 'updateRules', rules: duplicatedRule });
};

export const exportRulesAction = async (rules: Rule[], dispatch: React.Dispatch<Action>) => {
  dispatch({ type: 'setExportPayload', exportPayload: rules });
};

export const deleteRulesAction = async (
  ids: string[],
  dispatch: React.Dispatch<Action>,
  kbnVersion: string
) => {
  dispatch({ type: 'updateLoading', ids, isLoading: true });
  const deletedRules = await deleteRules({ ids, kbnVersion });
  dispatch({ type: 'deleteRules', rules: deletedRules });
};

export const enableRulesAction = async (
  ids: string[],
  enabled: boolean,
  dispatch: React.Dispatch<Action>,
  kbnVersion: string
) => {
  try {
    dispatch({ type: 'updateLoading', ids, isLoading: true });
    const updatedRules = await enableRules({ ids, enabled, kbnVersion });
    dispatch({ type: 'updateRules', rules: updatedRules });
  } catch {
    // TODO Add error toast support to actions (and @throw jsdoc to api calls)
    dispatch({ type: 'updateLoading', ids, isLoading: false });
  }
};
