/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filterVisualizationIds } from './utils';

// TODO: Add tests for resolveLensConfigFromAttachment once attachment mocking utilities are available
// The function was migrated from ToolResultStore to AttachmentStateManager

describe('filterVisualizationIds', () => {
  it('should remove specified IDs from the array', () => {
    const ids = ['viz1', 'viz2', 'viz3', 'viz4'];
    const result = filterVisualizationIds(ids, ['viz2', 'viz4']);

    expect(result).toEqual(['viz1', 'viz3']);
  });

  it('should return all IDs when no IDs match for removal', () => {
    const ids = ['viz1', 'viz2'];
    const result = filterVisualizationIds(ids, ['non-existent']);

    expect(result).toEqual(['viz1', 'viz2']);
  });

  it('should return empty array when all IDs are removed', () => {
    const ids = ['viz1', 'viz2'];
    const result = filterVisualizationIds(ids, ['viz1', 'viz2']);

    expect(result).toEqual([]);
  });

  it('should return original array when removal list is empty', () => {
    const ids = ['viz1', 'viz2'];
    const result = filterVisualizationIds(ids, []);

    expect(result).toEqual(['viz1', 'viz2']);
  });

  it('should handle empty input array', () => {
    const result = filterVisualizationIds([], ['viz1']);
    expect(result).toEqual([]);
  });
});
