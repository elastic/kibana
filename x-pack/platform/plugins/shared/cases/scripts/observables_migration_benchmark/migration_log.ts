/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';

export type MigrationPhase = 'rewrite' | 'pickup' | 'other';

export interface PhaseSegment {
  startedAt: string;
  endedAt?: string;
  seconds?: number;
}

export interface MigrationLog {
  file: string;
  firstLineAt?: string;
  /** One per Kibana start that migrated the index (its `INIT` step). */
  starts: string[];
  lastState?: string;
  /** Time spent in each phase, one segment per contiguous stay. */
  phases: Record<MigrationPhase, PhaseSegment[]>;
  documentsToProcess: number[];
  processedDocuments: number;
  migrationCompletedMs: number[];
  allMigrationsCompletedMs: number[];
  /** Polls of the mappings pickup that hit their 60 s wait and were retried. */
  pickupRetries: number;
  errorLines: number;
  migratorShutdown: boolean;
}

const LINE = /^\[(?<at>[^\]]+)\]\[(?<level>[A-Z]+)\s*\]\[(?<context>[^\]]+)\] (?<message>.*)$/;
const TRANSITION = /^(?<from>[A-Z_]+) -> (?<to>[A-Z_]+)\. took: (?<took>\d+)ms\.$/;
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

/**
 * Copies a substring out of the log text. V8 keeps a matched substring as a slice of the whole
 * file, so storing one would keep every parsed log in memory for as long as the result lives.
 */
const detach = (value: string): string => Buffer.from(value, 'utf8').toString('utf8');

/** Groups the v2 and ZDT control states of the index migration into what the benchmark reports. */
export const phaseOf = (state: string): MigrationPhase => {
  if (state.startsWith('OUTDATED_DOCUMENTS_') || state === 'TRANSFORMED_DOCUMENTS_BULK_INDEX') {
    return 'rewrite';
  }
  if (
    state.startsWith('UPDATE_TARGET_MAPPINGS_PROPERTIES') ||
    state.startsWith('UPDATE_INDEX_MAPPINGS')
  ) {
    return 'pickup';
  }
  return 'other';
};

const secondsBetween = (from: string, to: string): number =>
  Math.round((Date.parse(to) - Date.parse(from)) / 100) / 10;

/** Parses the saved-object migration of one index out of a Kibana log. */
export const parseMigrationLog = (file: string, index: string): MigrationLog => {
  const prefix = `[${index}] `;
  const log: MigrationLog = {
    file,
    starts: [],
    phases: { rewrite: [], pickup: [], other: [] },
    documentsToProcess: [],
    processedDocuments: 0,
    migrationCompletedMs: [],
    allMigrationsCompletedMs: [],
    pickupRetries: 0,
    errorLines: 0,
    migratorShutdown: false,
  };
  if (!fs.existsSync(file)) {
    return log;
  }

  let current: { phase: MigrationPhase; segment: PhaseSegment } | undefined;
  const leave = (at: string) => {
    if (current != null) {
      current.segment.endedAt = at;
      current.segment.seconds = secondsBetween(current.segment.startedAt, at);
      current = undefined;
    }
  };

  const handleLine = (raw: string): void => {
    const match = LINE.exec(raw.replace(ANSI, ''));
    if (match?.groups == null) {
      return;
    }
    const { level, message } = match.groups;
    const at = detach(match.groups.at);
    log.firstLineAt ??= at;

    const allCompleted = /^Completed all migrations in (\d+)ms/.exec(message);
    if (allCompleted != null) {
      log.allMigrationsCompletedMs.push(parseInt(allCompleted[1], 10));
    } else if (message.startsWith('Detected migrator node role')) {
      log.migratorShutdown = true;
    }
    if (!message.startsWith(prefix)) {
      return;
    }

    const body = message.slice(prefix.length);
    if (level === 'ERROR') {
      log.errorLines += 1;
      if (current?.phase === 'pickup' && body.includes('timeout_exception')) {
        log.pickupRetries += 1;
      }
    }

    const transition = TRANSITION.exec(body);
    if (transition?.groups != null) {
      const { from } = transition.groups;
      const to = detach(transition.groups.to);
      if (from === 'INIT') {
        log.starts.push(at);
      }
      const phase = phaseOf(to);
      if (current?.phase !== phase) {
        leave(at);
        if (phase !== 'other') {
          current = { phase, segment: { startedAt: at } };
          log.phases[phase].push(current.segment);
        }
      }
      log.lastState = to;
      return;
    }

    const starting = /^Starting to process (\d+) documents\.$/.exec(body);
    const processed = /^Processed (\d+) documents out of \d+\.$/.exec(body);
    const completed = /^Migration completed after (\d+)ms$/.exec(body);
    if (starting != null) {
      log.documentsToProcess.push(parseInt(starting[1], 10));
    } else if (processed != null) {
      log.processedDocuments = parseInt(processed[1], 10);
    } else if (completed != null) {
      leave(at);
      log.migrationCompletedMs.push(parseInt(completed[1], 10));
    }
  };

  fs.readFileSync(file, 'utf8').split('\n').forEach(handleLine);

  return log;
};

/** Seconds spent in a phase across all segments, including restarts. */
export const phaseSeconds = (log: MigrationLog, phase: MigrationPhase): number =>
  Math.round(log.phases[phase].reduce((sum, { seconds = 0 }) => sum + seconds, 0));
