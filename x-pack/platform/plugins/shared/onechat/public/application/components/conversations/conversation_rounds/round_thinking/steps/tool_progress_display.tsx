/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolCallProgress } from '@kbn/onechat-common/chat/conversation';
import type { ReactNode } from 'react';
import React from 'react';
import { ThinkingItemLayout } from './thinking_item_layout';

interface ToolProgressDisplayProps {
  progress: ToolCallProgress;
  icon?: ReactNode;
}

export const ToolProgressDisplay: React.FC<ToolProgressDisplayProps> = ({ progress, icon }) => {
  return (
    <ThinkingItemLayout icon={icon}>
      <div role="status" aria-live="polite">
        {progress.message}
      </div>
    </ThinkingItemLayout>
  );
};
