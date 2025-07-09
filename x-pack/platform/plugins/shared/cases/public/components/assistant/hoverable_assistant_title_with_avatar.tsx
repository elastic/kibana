/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { AssistantAvatar } from '@kbn/ai-assistant-icon';

import * as i18n from './translations';
import { AssistantTitle } from './assistant_title';

const HoverableAssistantTitleWithAvatarComponent: React.FC = () => {
  return (
    <EuiToolTip
      display="inlineBlock"
      position="top"
      content={i18n.ASSISTANT}
      data-test-subj="assistant-tooltip"
    >
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <AssistantAvatar
            name="machine"
            size="s"
            color="subdued"
            data-test-subj="assistant-avatar"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction={'column'} gutterSize="none">
            <EuiFlexItem>
              <AssistantTitle />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiToolTip>
  );
};
HoverableAssistantTitleWithAvatarComponent.displayName = 'HoverableAssistantTitleWithAvatar';

export const HoverableAssistantTitleWithAvatar = React.memo(
  HoverableAssistantTitleWithAvatarComponent
);
