/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';

/**
 * Round-level master toggle for the entire steps block.
 *
 * - Live rounds default to expanded.
 * - Reloaded historical rounds default to collapsed.
 * - Never auto-collapses; user toggles manually.
 *
 * Note: per-step expansion (clicking individual tool-call / background-agent
 * steps to reveal their sub-fields) is handled by `useState` inside those step
 * components themselves — no shared state needed.
 */
export interface MasterToggleApi {
  expanded: boolean;
  toggle: () => void;
}

export const useMasterToggle = ({
  initialExpanded,
}: {
  initialExpanded: boolean;
}): MasterToggleApi => {
  const [expanded, setExpanded] = useState(initialExpanded);
  const toggle = useCallback(() => setExpanded((v) => !v), []);
  return { expanded, toggle };
};
