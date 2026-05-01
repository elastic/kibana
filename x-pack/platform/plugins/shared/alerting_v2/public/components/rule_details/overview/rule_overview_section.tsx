/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EpisodesGanttSection } from './alert_episodes_gantt/episodes_gantt_section';

export const RuleOverviewSection: React.FC = () => (
  <div data-test-subj="ruleOverviewSection">
    <EpisodesGanttSection />
  </div>
);
