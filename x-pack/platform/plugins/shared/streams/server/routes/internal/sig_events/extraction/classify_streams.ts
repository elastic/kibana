/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '@kbn/streams-schema';
import type { WorkflowExecutionListItemDto } from '@kbn/workflows';
import { minimatch } from 'minimatch';
import { getStreamNameFromExecution } from '../../../../lib/workflows/workflow_client';

export interface StreamCandidate {
  streamName: string;
  lastCompletedAt: string | null;
}

export interface StreamClassificationResult {
  alreadyRunning: Array<{ streamName: string; scheduledAt: string | null }>;
  candidates: StreamCandidate[];
  upToDate: StreamCandidate[];
  excluded: string[];
  unsupported: string[];
  excludePatterns: string[];
}

export const parseExcludePatterns = (raw: string | undefined): string[] =>
  (raw ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

const matchesExcludePatterns = (name: string, patterns: string[]): boolean =>
  patterns.some((pattern) => minimatch(name, pattern));

/**
 * Classifies streams into buckets (excluded, already-running, candidates, up-to-date)
 * by checking workflow execution state for each stream.
 *
 * `runningExecutions`: non-terminal workflow executions (used for "alreadyRunning")
 * `completedExecutions`: completed workflow executions sorted by finishedAt desc
 *   (used to determine freshness: "upToDate" vs "candidate")
 */
export const classifyStreams = ({
  allStreams,
  runningExecutions,
  completedExecutions,
  excludedStreamPatterns,
  intervalHours,
}: {
  allStreams: Streams.all.Definition[];
  runningExecutions: WorkflowExecutionListItemDto[];
  completedExecutions: WorkflowExecutionListItemDto[];
  excludedStreamPatterns: string;
  intervalHours: number;
}): StreamClassificationResult => {
  const excludePatterns = parseExcludePatterns(excludedStreamPatterns);

  const excluded: string[] = [];
  const unsupported: string[] = [];
  const eligibleNames = new Set<string>();
  for (const stream of allStreams) {
    if (
      !Streams.WiredStream.Definition.is(stream) &&
      !Streams.ClassicStream.Definition.is(stream)
    ) {
      unsupported.push(stream.name);
      continue;
    }
    if (matchesExcludePatterns(stream.name, excludePatterns)) {
      excluded.push(stream.name);
    } else {
      eligibleNames.add(stream.name);
    }
  }

  const runningStreamNames = new Set<string>();
  const alreadyRunning: Array<{ streamName: string; scheduledAt: string | null }> = [];
  for (const exec of runningExecutions) {
    const streamName = getStreamNameFromExecution(exec);
    if (!streamName || !eligibleNames.has(streamName)) continue;
    runningStreamNames.add(streamName);
    alreadyRunning.push({ streamName, scheduledAt: exec.startedAt ?? null });
  }

  const intervalMs = intervalHours * 3_600_000;
  const now = Date.now();
  const candidates: StreamCandidate[] = [];
  const upToDate: StreamCandidate[] = [];
  const streamsWithCompletion = new Set<string>();

  const lastCompletedByStream = new Map<string, string>();
  for (const exec of completedExecutions) {
    const streamName = getStreamNameFromExecution(exec);
    if (!streamName || !eligibleNames.has(streamName)) continue;
    if (runningStreamNames.has(streamName)) continue;
    if (lastCompletedByStream.has(streamName)) continue;
    lastCompletedByStream.set(streamName, exec.finishedAt);
  }

  for (const [streamName, finishedAt] of lastCompletedByStream) {
    streamsWithCompletion.add(streamName);
    const lastActivityMs = new Date(finishedAt).getTime();
    if (now - lastActivityMs >= intervalMs) {
      candidates.push({ streamName, lastCompletedAt: finishedAt });
    } else {
      upToDate.push({ streamName, lastCompletedAt: finishedAt });
    }
  }

  const noHistoryStreams = [...eligibleNames].filter(
    (name) => !runningStreamNames.has(name) && !streamsWithCompletion.has(name)
  );
  const allCandidates = [
    ...noHistoryStreams.map((name) => ({ streamName: name, lastCompletedAt: null })),
    ...candidates,
  ];

  return {
    alreadyRunning,
    candidates: allCandidates,
    upToDate,
    excluded,
    unsupported,
    excludePatterns,
  };
};
