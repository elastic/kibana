/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as H from 'history';
import React from 'react';

import { DETECTION_ENGINE_PAGE_NAME } from '../../../../components/link_to/redirect_to_detection_engine';
import {
  deleteRules,
  duplicateRules,
  enableRules,
  Rule,
} from '../../../../containers/detection_engine/rules';
import { Action } from './reducer';

export const editRuleAction = (rule: Rule, history: H.History) => {
  history.push(`/${DETECTION_ENGINE_PAGE_NAME}/rules/id/${rule.id}/edit`);
};

export const runRuleAction = () => {};

export const duplicateRuleAction = async (rule: Rule, dispatch: React.Dispatch<Action>) => {
  dispatch({ type: 'updateLoading', ids: [rule.id], isLoading: true });
  const duplicatedRule = await duplicateRules({ rules: [rule] });
  dispatch({ type: 'updateLoading', ids: [rule.id], isLoading: false });
  dispatch({ type: 'updateRules', rules: duplicatedRule, appendRuleId: rule.id });
};

export const exportRulesAction = async (rules: Rule[], dispatch: React.Dispatch<Action>) => {
  dispatch({ type: 'setExportPayload', exportPayload: rules });
};

export const deleteRulesAction = async (ids: string[], dispatch: React.Dispatch<Action>) => {
  dispatch({ type: 'updateLoading', ids, isLoading: true });
  const deletedRules = await deleteRules({ ids });
  dispatch({ type: 'deleteRules', rules: deletedRules });
};

export const enableRulesAction = async (
  ids: string[],
  enabled: boolean,
  dispatch: React.Dispatch<Action>
) => {
  try {
    dispatch({ type: 'updateLoading', ids, isLoading: true });
    const updatedRules = await enableRules({ ids, enabled });
    dispatch({ type: 'updateRules', rules: updatedRules });
  } catch {
    // TODO Add error toast support to actions (and @throw jsdoc to api calls)
    dispatch({ type: 'updateLoading', ids, isLoading: false });
  }
};
