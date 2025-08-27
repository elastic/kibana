/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip } from '@elastic/eui';

import * as i18n from './translations';
import { AssistantTitle } from './assistant_title';

const HoverableAssistantTitleComponent: React.FC = () => {
  return (
    <EuiToolTip
      display="inlineBlock"
      position="top"
      content={i18n.ASSISTANT}
      data-test-subj="assistant-tooltip"
    >
      <AssistantTitle />
    </EuiToolTip>
  );
};
HoverableAssistantTitleComponent.displayName = 'HoverableAssistantTitle';

export const HoverableAssistantTitle = React.memo(HoverableAssistantTitleComponent);
