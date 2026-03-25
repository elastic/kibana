/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface EpisodeAction {
  episodeId: string;
  ruleId: string | null;
  groupHash: string | null;
  lastAckAction: string | null;
  lastDeactivateAction: string | null;
  lastSnoozeAction: string | null;
  tags: string[];
}
