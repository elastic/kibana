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
import { ColumnTypes } from './index';
import React from 'react';

export const editRuleAction = () => {
  console.log('Editing Rule...');
};

export const runRuleAction = () => {
  console.log('Running Rule...');
};

export const duplicateRuleAction = async (rowItem: ColumnTypes) => {
  console.log('Duplicating Rule...', rowItem);
  const duplicateResponse = await duplicateRule({ rule: rowItem.sourceRule, kbnVersion: '8.0.0' });
  console.log('duplicateResponse', duplicateResponse);
};

export const exportRuleAction = async (rowItem: ColumnTypes) => {
  console.log('Exporting Rule...', rowItem);
  const exportResponse = await exportRules({ ruleIds: [rowItem.id], kbnVersion: '8.0.0' });
  console.log('exportResponse', exportResponse);
};

export const deleteRulesAction = async (rowItem: ColumnTypes) => {
  console.log('Deleting following Rules:', rowItem);
  const deleteResponse = await deleteRules({
    ruleIds: [rowItem.sourceRule.id],
    kbnVersion: '8.0.0',
  });
  console.log('Delete Response:', deleteResponse);
};

export const enableRuleAction = () => {
  console.log('Enabling Rule...');
};
