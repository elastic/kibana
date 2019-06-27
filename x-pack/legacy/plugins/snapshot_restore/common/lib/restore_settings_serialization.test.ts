/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { serializeRestoreSettings } from './restore_settings_serialization';

describe('restore_settings_serialization()', () => {
  it('should serialize blank restore settings', () => {
    expect(serializeRestoreSettings({})).toEqual({});
  });

  it('should serialize partial restore settings', () => {
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
      })
    ).toEqual({
      indices: ['foo', 'bar'],
      rename_pattern: 'capture_pattern',
      rename_replacement: 'replacement_pattern',
      include_global_state: true,
      partial: true,
      index_settings: { modified_setting: 123 },
      ignore_index_settings: ['setting1'],
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
