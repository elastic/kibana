/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { ConversationSidebarToggle } from '../../conversations/conversation_sidebar/conversation_sidebar_toggle';
import { HeaderRightActions } from './header_right_actions';
import { HeaderLeftActions } from './header_left_actions';

interface EvaluationsHeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const EvaluationsHeader: React.FC<EvaluationsHeaderProps> = ({
  isSidebarOpen,
  onToggleSidebar,
}) => {
  return (
    <EuiFlexGroup>
      <EuiFlexGroup>
        <ConversationSidebarToggle isSidebarOpen={isSidebarOpen} onToggle={onToggleSidebar} />
        <HeaderLeftActions />
      </EuiFlexGroup>
      <HeaderRightActions />
    </EuiFlexGroup>
  );
};
