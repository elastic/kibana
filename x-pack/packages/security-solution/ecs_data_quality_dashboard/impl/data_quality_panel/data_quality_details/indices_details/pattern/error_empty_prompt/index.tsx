/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiCode } from '@elastic/eui';
import React from 'react';

import * as i18n from '../../../../translations';

interface Props {
  title: string;
}

const ErrorEmptyPromptComponent: React.FC<Props> = ({ title }) => (
  <EuiCallOut color="danger" size="s" data-test-subj="errorEmptyPrompt" title={title}>
    <p>{i18n.ERRORS_MAY_OCCUR}</p>

    <span>{i18n.THE_FOLLOWING_PRIVILEGES_ARE_REQUIRED}</span>
    <ul>
      <li>
        <EuiCode>{i18n.MONITOR}</EuiCode> {i18n.OR} <EuiCode>{i18n.MANAGE}</EuiCode>
      </li>
      <li>
        <EuiCode>{i18n.VIEW_INDEX_METADATA}</EuiCode>
      </li>
      <li>
        <EuiCode>{i18n.READ}</EuiCode>
      </li>
    </ul>
  </EuiCallOut>
);

export const ErrorEmptyPrompt = React.memo(ErrorEmptyPromptComponent);
