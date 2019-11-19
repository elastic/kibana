/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  deleteRules,
  duplicateRule,
  exportRules,
} from '../../../../containers/detection_engine/rules/api';
import { Action, ColumnTypes } from './index';
import React from 'react';

export const editRuleAction = () => {
  console.log('Editing Rule...');
};

export const runRuleAction = () => {
  console.log('Running Rule...');
};

export const duplicateRuleAction = async (
  rowItem: ColumnTypes,
  dispatch: React.Dispatch<Action>
) => {
  console.log('Duplicating Rule...', rowItem);
  const duplicatedRule = await duplicateRule({ rule: rowItem.sourceRule, kbnVersion: '8.0.0' });
  dispatch({ type: 'updateRules', rules: [duplicatedRule] });
  console.log('duplicatedRule', duplicatedRule);
};

export const exportRuleAction = async (rowItem: ColumnTypes) => {
  console.log('Exporting Rule...', rowItem);
  const exportResponse = await exportRules({ ruleIds: [rowItem.rule_id], kbnVersion: '8.0.0' });
  console.log('exportResponse', exportResponse);
};

export const deleteRulesAction = async (rowItem: ColumnTypes, dispatch: React.Dispatch<Action>) => {
  console.log('Deleting following Rules:', rowItem);
  const deletedRules = await deleteRules({
    ruleIds: [rowItem.sourceRule.rule_id],
    kbnVersion: '8.0.0',
  });
  dispatch({ type: 'deleteRules', rules: deletedRules });
  console.log('deletedRules:', deletedRules);
};

export const enableRuleAction = () => {
  console.log('Enabling Rule...');
};
