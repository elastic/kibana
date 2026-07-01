/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0".
 */

import React from 'react';

import { UnifiedSidebarPanel } from './unified_sidebar_panel';
export { CONDENSED_SIDEBAR_WIDTH, SIDEBAR_WIDTH } from './unified_sidebar.constants';

interface UnifiedSidebarProps {
  onToggleCondensed: () => void;
}

export const UnifiedSidebar: React.FC<UnifiedSidebarProps> = ({ onToggleCondensed }) => {
  return <UnifiedSidebarPanel onToggleCondensed={onToggleCondensed} />;
};
