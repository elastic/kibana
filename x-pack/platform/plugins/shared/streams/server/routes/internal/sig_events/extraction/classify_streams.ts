/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams, TaskStatus } from '@kbn/streams-schema';
import { minimatch } from 'minimatch';
import type { PersistedTask } from '../../../../lib/tasks/types';
import type { FeaturesIdentificationTaskParams } from '../../../../lib/tasks/task_definitions/features_identification';

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
 * by walking the ES-sorted task list and comparing each stream's last activity
 * against the configured extraction interval.
 */
export const classifyStreams = ({
  allStreams,
  sortedTasks,
  excludedStreamPatterns,
  intervalHours,
}: {
  allStreams: Streams.all.Definition[];
  sortedTasks: Array<PersistedTask<FeaturesIdentificationTaskParams>>;
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

  const intervalMs = intervalHours * 3_600_000;
  const now = Date.now();
  const alreadyRunning: Array<{ streamName: string; scheduledAt: string | null }> = [];
  const candidates: StreamCandidate[] = [];
  const upToDate: StreamCandidate[] = [];
  const streamsWithTask = new Set<string>();

  for (const task of sortedTasks) {
    const streamName = task.task.params.streamName;
    if (!eligibleNames.has(streamName)) continue;
    streamsWithTask.add(streamName);

    if (task.status === TaskStatus.InProgress || task.status === TaskStatus.BeingCanceled) {
      alreadyRunning.push({ streamName, scheduledAt: task.created_at || null });
    } else {
      const lastActivityAt =
        task.status === TaskStatus.Failed ? task.last_failed_at : task.last_completed_at;
      const lastActivityMs = lastActivityAt ? new Date(lastActivityAt).getTime() : 0;
      if (now - lastActivityMs >= intervalMs) {
        candidates.push({ streamName, lastCompletedAt: task.last_completed_at ?? null });
      } else {
        upToDate.push({ streamName, lastCompletedAt: task.last_completed_at ?? null });
      }
    }
  }

  const noTaskStreams = [...eligibleNames].filter((name) => !streamsWithTask.has(name));
  const allCandidates = [
    ...noTaskStreams.map((name) => ({ streamName: name, lastCompletedAt: null })),
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
