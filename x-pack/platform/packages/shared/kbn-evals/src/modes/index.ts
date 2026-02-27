/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Evaluation Execution Modes
 *
 * This module provides different execution modes for running evaluations:
 *
 * - **Continuous Mode**: Watches files for changes and triggers evaluations automatically.
 *   Supports both chokidar file watching and git hook integration.
 *
 * - **Scheduled Mode**: Runs evaluations on a cron schedule using node-cron.
 *   Useful for regular automated evaluation runs.
 *
 * @module modes
 */

export {
  createContinuousMode,
  createGitHookTriggerMode,
  touchTriggerFile,
  type ContinuousMode,
  type ContinuousModeConfig,
  type ContinuousModeController,
  type ContinuousModeStats,
  type ContinuousModeStatus,
  type FileChangeEvent,
  type FileChangeEventType,
  type OnFileChangeCallback,
} from './continuous';

export {
  createScheduledMode,
  isValidCronExpression,
  CronPresets,
  type ScheduledMode,
  type ScheduledModeConfig,
  type ScheduledModeController,
  type ScheduledModeStats,
  type ScheduledModeStatus,
  type ScheduledEvent,
  type OnScheduledCallback,
} from './scheduled';

export {
  createModeFromCliArgs,
  parseModeCliArgs,
  validateModeCliArgs,
  isContinuousModeController,
  isScheduledModeController,
  getCronPreset,
  getModeCliHelp,
  type ModeType,
  type ModeController,
  type ModeCliArgs,
  type ModeFactoryConfig,
  type ModeFactoryResult,
} from './factory';
