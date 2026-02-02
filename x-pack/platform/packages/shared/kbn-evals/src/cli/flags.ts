/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlagOptions } from '@kbn/dev-cli-runner';
import type { ModeType } from '../modes/factory';

/**
 * Output format options for evaluation results.
 */
export type OutputFormat = 'json' | 'table' | 'markdown' | 'silent';

/**
 * Parsed CLI arguments for the evals CLI.
 */
export interface EvalsCliArgs {
  /**
   * Path to the configuration file.
   * Specifies the eval suite configuration to use.
   */
  config?: string;

  /**
   * Execution mode for the evals runner.
   * - 'once': Run evaluations once and exit (default)
   * - 'continuous': Watch files for changes and re-run evaluations
   * - 'scheduled': Run evaluations on a cron schedule
   * - 'git-hook': Watch for git hook trigger file
   */
  mode: ModeType;

  /**
   * Cron schedule expression for scheduled mode.
   * Only used when mode is 'scheduled'.
   * Example: '0 * * * *' for every hour
   */
  schedule?: string;

  /**
   * Output format for evaluation results.
   * - 'json': JSON output (machine-readable)
   * - 'table': Table output (human-readable, default)
   * - 'markdown': Markdown format
   * - 'silent': Suppress output
   */
  output: OutputFormat;

  /**
   * Connector ID for the inference API.
   * Specifies which connector to use for LLM calls.
   */
  connectorId?: string;

  /**
   * Model identifier to use for evaluations.
   * Overrides the model specified in the config file.
   */
  model?: string;

  /**
   * Enable verbose logging output.
   * Shows detailed information about evaluation progress.
   */
  verbose: boolean;

  /**
   * Enable dry-run mode.
   * Validates configuration and shows what would be executed
   * without actually running evaluations.
   */
  dryRun: boolean;
}

/**
 * Flag options configuration for @kbn/dev-cli-runner.
 *
 * Defines all CLI flags supported by the evals CLI:
 * - --config: Config file path
 * - --mode: Execution mode (once, continuous, scheduled, git-hook)
 * - --schedule: Cron expression for scheduled mode
 * - --output: Output format (json, table, markdown, silent)
 * - --connector-id: Connector ID for inference API
 * - --model: Model identifier override
 * - --verbose: Enable verbose logging
 * - --dry-run: Validate without executing
 */
export const EVALS_CLI_FLAG_OPTIONS: FlagOptions = {
  string: ['config', 'mode', 'schedule', 'output', 'connector-id', 'model'],
  boolean: ['verbose', 'dry-run'],
  default: {
    mode: 'once',
    output: 'table',
    verbose: false,
    'dry-run': false,
  },
  alias: {
    c: 'config',
    m: 'mode',
    s: 'schedule',
    o: 'output',
    v: 'verbose',
    n: 'dry-run',
  },
  help: `
Evaluation CLI Options:
  -c, --config <path>       Path to the eval suite configuration file
  -m, --mode <type>         Execution mode: once, continuous, scheduled, git-hook (default: once)
  -s, --schedule <cron>     Cron expression for scheduled mode (e.g., '0 * * * *')
  -o, --output <format>     Output format: json, table, markdown, silent (default: table)
      --connector-id <id>   Connector ID for the inference API
      --model <name>        Model identifier to use (overrides config)
  -v, --verbose             Enable verbose logging
  -n, --dry-run             Validate configuration without running evaluations

Examples:
  # Run evaluations once with a config file
  node scripts/run_evals --config ./evals.config.ts

  # Run in continuous mode watching for changes
  node scripts/run_evals --config ./evals.config.ts --mode continuous

  # Run on a schedule every hour
  node scripts/run_evals --config ./evals.config.ts --mode scheduled --schedule '0 * * * *'

  # Dry run to validate configuration
  node scripts/run_evals --config ./evals.config.ts --dry-run --verbose

  # Use specific connector and model
  node scripts/run_evals --config ./evals.config.ts --connector-id my-connector --model gpt-4
  `,
} as const;

/**
 * Valid mode values for validation.
 */
export const VALID_MODES: readonly ModeType[] = ['once', 'continuous', 'scheduled', 'git-hook'];

/**
 * Valid output format values for validation.
 */
export const VALID_OUTPUT_FORMATS: readonly OutputFormat[] = [
  'json',
  'table',
  'markdown',
  'silent',
];

/**
 * Validates and parses the mode flag value.
 *
 * @param value - The raw mode flag value
 * @returns The validated ModeType
 * @throws Error if the mode is invalid
 */
export function parseMode(value: string | undefined): ModeType {
  const mode = value ?? 'once';
  if (!VALID_MODES.includes(mode as ModeType)) {
    throw new Error(
      `Invalid --mode value "${mode}". Expected one of: ${VALID_MODES.join(', ')}`
    );
  }
  return mode as ModeType;
}

/**
 * Validates and parses the output format flag value.
 *
 * @param value - The raw output flag value
 * @returns The validated OutputFormat
 * @throws Error if the output format is invalid
 */
export function parseOutputFormat(value: string | undefined): OutputFormat {
  const format = value ?? 'table';
  if (!VALID_OUTPUT_FORMATS.includes(format as OutputFormat)) {
    throw new Error(
      `Invalid --output value "${format}". Expected one of: ${VALID_OUTPUT_FORMATS.join(', ')}`
    );
  }
  return format as OutputFormat;
}

/**
 * Parses and validates CLI flags into typed EvalsCliArgs.
 *
 * @param flags - Raw flags object from @kbn/dev-cli-runner
 * @returns Validated and typed CLI arguments
 * @throws Error if any flag values are invalid
 */
export function parseEvalsCliFlags(flags: Record<string, unknown>): EvalsCliArgs {
  const mode = parseMode(flags.mode as string | undefined);
  const output = parseOutputFormat(flags.output as string | undefined);

  // Validate schedule is provided for scheduled mode
  if (mode === 'scheduled' && !flags.schedule) {
    throw new Error('--schedule is required when using --mode scheduled');
  }

  return {
    config: flags.config as string | undefined,
    mode,
    schedule: flags.schedule as string | undefined,
    output,
    connectorId: flags['connector-id'] as string | undefined,
    model: flags.model as string | undefined,
    verbose: Boolean(flags.verbose),
    dryRun: Boolean(flags['dry-run']),
  };
}

/**
 * Type guard to check if a value is a valid ModeType.
 */
export function isValidMode(value: unknown): value is ModeType {
  return typeof value === 'string' && VALID_MODES.includes(value as ModeType);
}

/**
 * Type guard to check if a value is a valid OutputFormat.
 */
export function isValidOutputFormat(value: unknown): value is OutputFormat {
  return typeof value === 'string' && VALID_OUTPUT_FORMATS.includes(value as OutputFormat);
}
