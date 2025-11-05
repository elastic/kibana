/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolCallProgress, ToolCallStep } from '@kbn/onechat-common';
import React from 'react';
import { ThinkingItemLayout } from './thinking_item_layout';

const ToolProgressDisplay: React.FC<{
  progress: ToolCallProgress;
}> = ({ progress }) => {
  return (
    <ThinkingItemLayout>
      <div role="status" aria-live="polite">
        {progress.message}
      </div>
    </ThinkingItemLayout>
  );
};

export const getProgressionThinkingItems = ({
  step,
  stepIndex,
}: {
  step: ToolCallStep;
  stepIndex: number;
}) => {
  return (
    step.progression?.map((progress, index) => (
      <ToolProgressDisplay
        key={`step-${stepIndex}-${step.tool_id}-progress-${index}`}
        progress={progress}
      />
    )) ?? []
  );
};
