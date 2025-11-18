/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolResult } from '@kbn/agent-builder-common';
import { useState, useCallback } from 'react';

export const useToolResultsFlyout = () => {
  const [toolResults, setToolResults] = useState<ToolResult[] | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openFlyout = useCallback((results: ToolResult[]) => {
    setToolResults(results);
    setIsOpen(true);
  }, []);

  const closeFlyout = useCallback(() => {
    setToolResults(null);
    setIsOpen(false);
  }, []);

  return { toolResults, isOpen, openFlyout, closeFlyout };
};
