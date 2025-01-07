/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serializeRestoreSettings } from './restore_settings_serialization';

describe('restore_settings_serialization()', () => {
  it('should serialize blank restore settings', () => {
    expect(serializeRestoreSettings({})).toEqual({});
  });

  it('should serialize partial restore settings with array indices', () => {
    expect(serializeRestoreSettings({})).toEqual({});
    expect(
      serializeRestoreSettings({
        indices: ['foo', 'bar'],
        ignoreIndexSettings: ['setting1'],
        partial: true,
      })
    ).toEqual({
      indices: ['foo', 'bar'],
      ignore_index_settings: ['setting1'],
      partial: true,
    });
  });

  it('should serialize partial restore settings with index pattern', () => {
    expect(
      serializeRestoreSettings({
        indices: 'foo*,bar',
        ignoreIndexSettings: ['setting1'],
        partial: true,
      })
    ).toEqual({
      indices: 'foo*,bar',
      ignore_index_settings: ['setting1'],
      partial: true,
    });
  });

  it('should serialize feature_states', () => {
    expect(
      serializeRestoreSettings({
        indices: ['foo'],
        featureStates: ['kibana', 'machinelearning'],
      })
    ).toEqual({
      indices: ['foo'],
      feature_states: ['kibana', 'machinelearning'],
    });
  });

  it('should serialize full restore settings', () => {
    expect(
      serializeRestoreSettings({
        indices: ['foo', 'bar'],
        renamePattern: 'capture_pattern',
        renameReplacement: 'replacement_pattern',
        includeGlobalState: true,
        partial: true,
        indexSettings: '{"modified_setting":123}',
        ignoreIndexSettings: ['setting1'],
        ignoreUnavailable: true,
        includeAliases: true,
      })
    ).toEqual({
      indices: ['foo', 'bar'],
      rename_pattern: 'capture_pattern',
      rename_replacement: 'replacement_pattern',
      include_global_state: true,
      partial: true,
      index_settings: { modified_setting: 123 },
      ignore_index_settings: ['setting1'],
      ignore_unavailable: true,
      include_aliases: true,
    });
  });

  it('should skip serialization of invalid json index settings', () => {
    expect(
      serializeRestoreSettings({
        indexSettings: '{"invalid_setting:123,}',
      })
    ).toEqual({});
  });
});
