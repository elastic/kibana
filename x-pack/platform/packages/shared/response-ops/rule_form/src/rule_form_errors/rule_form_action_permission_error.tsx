/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import {
  RULE_FORM_PAGE_RULE_ACTIONS_NO_PERMISSION_TITLE,
  RULE_FORM_PAGE_RULE_ACTIONS_NO_PERMISSION_DESCRIPTION,
} from '../translations';

export const RuleFormActionPermissionError = () => {
  return (
    <EuiEmptyPrompt
      iconType="error"
      color="danger"
      title={
        <EuiText color="default">
          <h2>{RULE_FORM_PAGE_RULE_ACTIONS_NO_PERMISSION_TITLE}</h2>
        </EuiText>
      }
      body={
        <EuiText>
          <p>{RULE_FORM_PAGE_RULE_ACTIONS_NO_PERMISSION_DESCRIPTION}</p>
        </EuiText>
      }
    />
  );
};
