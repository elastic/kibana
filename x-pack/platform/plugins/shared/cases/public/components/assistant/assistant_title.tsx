/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';

import * as i18n from './translations';

const AssistantTitleComponent: React.FC = () => {
  return (
    <EuiText size={'s'} className={'eui-textBreakWord'} data-test-subj={'assistant-title'}>
      <strong data-test-subj={'assistant-bolded'}>{i18n.ASSISTANT}</strong>
    </EuiText>
  );
};
AssistantTitleComponent.displayName = 'AssistantTitle';

export const AssistantTitle = React.memo(AssistantTitleComponent);
