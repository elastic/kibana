/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiToolTip } from '@elastic/eui';

import * as i18n from './translations';

const HoverableAssistantResolverComponent: React.FC = () => {
  return (
    <EuiToolTip
      display="inlineBlock"
      position="top"
      content={i18n.ASSISTANT}
      data-test-subj="assistant-tooltip"
    >
      <EuiText size="s" className="eui-textBreakWord" data-test-subj="assistant-title">
        <strong data-test-subj={'assistant-bolded'}>{i18n.ASSISTANT}</strong>
      </EuiText>
    </EuiToolTip>
  );
};
HoverableAssistantResolverComponent.displayName = 'HoverableAssistantResolver';

export const HoverableAssistantResolver = React.memo(HoverableAssistantResolverComponent);
