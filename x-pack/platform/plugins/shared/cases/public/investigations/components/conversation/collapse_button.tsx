/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import { ICONS } from '../../icons';
import { useCollapseToSideChat } from './use_collapse_to_side_chat';
import * as i18n from './translations';

/** "Collapse to side panel": the Conversation tab becomes the side panel's Chat. */
export const CollapseButton: React.FC = () => {
  const collapse = useCollapseToSideChat();

  return (
    <EuiToolTip content={i18n.COLLAPSE_TOOLTIP} disableScreenReaderOutput>
      <EuiButtonEmpty
        size="s"
        iconType={ICONS.chevronRight}
        iconSide="right"
        aria-label={i18n.COLLAPSE_ARIA}
        onClick={collapse}
        data-test-subj="investigationConversationCollapse"
      >
        {i18n.COLLAPSE}
      </EuiButtonEmpty>
    </EuiToolTip>
  );
};
CollapseButton.displayName = 'CollapseButton';
