/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import type { RegexAnonymizationRule } from '@kbn/inference-common';
import { PatternTesterPanel } from './pattern_tester_panel';

interface PatternTesterTabProps {
  builtInPatterns: RegexAnonymizationRule[];
  customPatterns: RegexAnonymizationRule[];
}

/** Full-page Pattern tester: exercises every currently-enabled built-in and custom pattern. */
export const PatternTesterTab: React.FC<PatternTesterTabProps> = ({
  builtInPatterns,
  customPatterns,
}) => {
  const enabledRules = useMemo(
    () => [...builtInPatterns, ...customPatterns].filter((rule) => rule.enabled),
    [builtInPatterns, customPatterns]
  );

  return <PatternTesterPanel rules={enabledRules} />;
};
