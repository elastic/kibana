/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import {
  DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG,
  type SignificantEventsTuningConfig,
} from '@kbn/significant-events-schema';
import { getSignificantEventsTuningConfig } from './get_significant_events_tuning_config';

const makeUiSettingsClient = (stored: unknown): jest.Mocked<IUiSettingsClient> =>
  ({
    get: jest.fn().mockResolvedValue(JSON.stringify(stored)),
  } as unknown as jest.Mocked<IUiSettingsClient>);

const makeLogger = (): jest.Mocked<Logger> =>
  ({
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  } as unknown as jest.Mocked<Logger>);

describe('getSignificantEventsTuningConfig', () => {
  it('returns defaults when uiSettings throws', async () => {
    const uiSettings = {
      get: jest.fn().mockRejectedValue(new Error('not found')),
    } as unknown as jest.Mocked<IUiSettingsClient>;
    const logger = makeLogger();

    const result = await getSignificantEventsTuningConfig(uiSettings, logger);

    expect(result).toEqual(DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });

  it('returns defaults when stored value is not valid JSON', async () => {
    const uiSettings = {
      get: jest.fn().mockResolvedValue('{not-valid-json'),
    } as unknown as jest.Mocked<IUiSettingsClient>;
    const logger = makeLogger();

    const result = await getSignificantEventsTuningConfig(uiSettings, logger);

    expect(result).toEqual(DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('merges valid stored values over defaults for missing keys', async () => {
    const stored: Partial<SignificantEventsTuningConfig> = { sample_size: 50, max_iterations: 10 };
    const result = await getSignificantEventsTuningConfig(
      makeUiSettingsClient(stored),
      makeLogger()
    );

    expect(result).toEqual({
      ...DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG,
      sample_size: 50,
      max_iterations: 10,
    });
  });

  it('returns full defaults when stored config is an empty object', async () => {
    const result = await getSignificantEventsTuningConfig(makeUiSettingsClient({}), makeLogger());
    expect(result).toEqual(DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG);
  });

  it('silently drops unknown/renamed keys instead of falling back to defaults', async () => {
    const stored = { sample_size: 30, legacy_field_from_v1: 99, another_old_key: 'foo' };
    const logger = makeLogger();

    const result = await getSignificantEventsTuningConfig(makeUiSettingsClient(stored), logger);

    expect(result).toEqual({ ...DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG, sample_size: 30 });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('handles stored value of null without throwing', async () => {
    const result = await getSignificantEventsTuningConfig(makeUiSettingsClient(null), makeLogger());
    expect(result).toEqual(DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG);
  });

  it('falls back to full defaults when an out-of-bounds field is stored', async () => {
    // sample_size max is 100; 500 is out of bounds
    const stored = { sample_size: 500 };
    const logger = makeLogger();

    const result = await getSignificantEventsTuningConfig(makeUiSettingsClient(stored), logger);

    expect(result).toEqual(DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('invalid'));
  });

  it('falls back to full defaults when entity_filtered_ratio + diverse_ratio > 1', async () => {
    const stored: Partial<SignificantEventsTuningConfig> = {
      entity_filtered_ratio: 0.7,
      diverse_ratio: 0.5,
    };
    const logger = makeLogger();

    const result = await getSignificantEventsTuningConfig(makeUiSettingsClient(stored), logger);

    expect(result).toEqual(DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('invalid'));
  });

  it('resets semantic_min_score and warns when it is on the old 0-100 scale', async () => {
    const stored: Partial<SignificantEventsTuningConfig> = { semantic_min_score: 75 };
    const logger = makeLogger();

    const result = await getSignificantEventsTuningConfig(makeUiSettingsClient(stored), logger);

    expect(result.semantic_min_score).toBe(
      DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG.semantic_min_score
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('semantic_min_score'));
  });
});
