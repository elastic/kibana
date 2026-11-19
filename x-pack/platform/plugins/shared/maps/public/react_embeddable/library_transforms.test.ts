/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getByReferenceState,
  getByValueState,
  initializeLibraryTransforms,
} from './library_transforms';
import type { MapByReferenceState, MapByValueState } from '../../common';
import type { MapAttributes } from '../../server';

jest.mock('../kibana_services', () => ({
  getCore: jest.fn(),
}));

jest.mock('../content_management', () => ({
  hasLibraryItemWithTitle: jest.fn(),
  getMapClient: jest.fn(),
}));

import { getCore } from '../kibana_services';
import { getMapClient } from '../content_management';

const mockGetCore = getCore as jest.Mock;
const mockGetMapClient = getMapClient as jest.Mock;

const mockAttributes: MapAttributes = {
  title: 'test map',
  layerListJSON: '[]',
} as MapAttributes;

describe('getByReferenceState', () => {
  test('strips attributes from by-value state and adds savedObjectId', () => {
    const byValueState: MapByValueState = {
      attributes: mockAttributes,
      isLayerTOCOpen: true,
    };
    const result = getByReferenceState(byValueState, 'saved-object-123');
    expect(result).toEqual({
      isLayerTOCOpen: true,
      savedObjectId: 'saved-object-123',
    });
    expect(result).not.toHaveProperty('attributes');
  });

  test('returns only savedObjectId when state is undefined', () => {
    const result = getByReferenceState(undefined, 'saved-object-123');
    expect(result).toEqual({ savedObjectId: 'saved-object-123' });
  });

  test('preserves all base state fields except attributes', () => {
    const byValueState: MapByValueState = {
      attributes: mockAttributes,
      isLayerTOCOpen: false,
      openTOCDetails: ['layer1'],
      hiddenLayers: ['layer2'],
      filterByMapExtent: true,
    };
    const result = getByReferenceState(byValueState, 'saved-object-456');
    expect(result).toEqual({
      isLayerTOCOpen: false,
      openTOCDetails: ['layer1'],
      hiddenLayers: ['layer2'],
      filterByMapExtent: true,
      savedObjectId: 'saved-object-456',
    });
  });
});

describe('getByValueState', () => {
  test('strips savedObjectId from by-reference state and adds attributes', () => {
    const byRefState: MapByReferenceState = {
      savedObjectId: 'saved-object-123',
      isLayerTOCOpen: true,
    };
    const result = getByValueState(byRefState, mockAttributes);
    expect(result).toEqual({
      isLayerTOCOpen: true,
      attributes: mockAttributes,
    });
    expect(result).not.toHaveProperty('savedObjectId');
  });

  test('returns only attributes when state is undefined', () => {
    const result = getByValueState(undefined, mockAttributes);
    expect(result).toEqual({ attributes: mockAttributes });
  });

  test('preserves all base state fields except savedObjectId', () => {
    const byRefState: MapByReferenceState = {
      savedObjectId: 'saved-object-456',
      isLayerTOCOpen: false,
      openTOCDetails: ['layer1'],
      hiddenLayers: ['layer2'],
      filterByMapExtent: true,
    };
    const result = getByValueState(byRefState, mockAttributes);
    expect(result).toEqual({
      isLayerTOCOpen: false,
      openTOCDetails: ['layer1'],
      hiddenLayers: ['layer2'],
      filterByMapExtent: true,
      attributes: mockAttributes,
    });
  });
});

describe('initializeLibraryTransforms', () => {
  const mockSerializeByReference = jest.fn();
  const mockSerializeByValue = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('canLinkToLibrary', () => {
    test('returns true when maps.save is true and panel is not by reference', async () => {
      mockGetCore.mockReturnValue({
        application: { capabilities: { maps_v2: { save: true } } },
      });
      const { canLinkToLibrary } = initializeLibraryTransforms(
        false,
        mockSerializeByReference,
        mockSerializeByValue
      );
      expect(await canLinkToLibrary()).toBe(true);
    });

    test('returns false when panel is already by reference', async () => {
      mockGetCore.mockReturnValue({
        application: { capabilities: { maps_v2: { save: true } } },
      });
      const { canLinkToLibrary } = initializeLibraryTransforms(
        true,
        mockSerializeByReference,
        mockSerializeByValue
      );
      expect(await canLinkToLibrary()).toBe(false);
    });

    test('returns false when maps.save capability is false', async () => {
      mockGetCore.mockReturnValue({
        application: { capabilities: { maps_v2: { save: false } } },
      });
      const { canLinkToLibrary } = initializeLibraryTransforms(
        false,
        mockSerializeByReference,
        mockSerializeByValue
      );
      expect(await canLinkToLibrary()).toBe(false);
    });
  });

  describe('canUnlinkFromLibrary', () => {
    test('returns true when panel is by reference', async () => {
      const { canUnlinkFromLibrary } = initializeLibraryTransforms(
        true,
        mockSerializeByReference,
        mockSerializeByValue
      );
      expect(await canUnlinkFromLibrary()).toBe(true);
    });

    test('returns false when panel is not by reference', async () => {
      const { canUnlinkFromLibrary } = initializeLibraryTransforms(
        false,
        mockSerializeByReference,
        mockSerializeByValue
      );
      expect(await canUnlinkFromLibrary()).toBe(false);
    });
  });

  describe('saveToLibrary', () => {
    test('creates a saved object with the given title and returns its id', async () => {
      const mockCreate = jest.fn().mockResolvedValue({ item: { id: 'new-saved-object-id' } });
      mockGetMapClient.mockReturnValue({ create: mockCreate });
      mockSerializeByValue.mockReturnValue({ attributes: mockAttributes });

      const { saveToLibrary } = initializeLibraryTransforms(
        false,
        mockSerializeByReference,
        mockSerializeByValue
      );
      const savedObjectId = await saveToLibrary('my map title');

      expect(savedObjectId).toBe('new-saved-object-id');
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          ...mockAttributes,
          title: 'my map title',
        },
      });
    });
  });

  describe('getSerializedStateByReference', () => {
    test('delegates to serializeByReference', () => {
      const mockByRefState: MapByReferenceState = { savedObjectId: 'abc' };
      mockSerializeByReference.mockReturnValue(mockByRefState);

      const { getSerializedStateByReference } = initializeLibraryTransforms(
        true,
        mockSerializeByReference,
        mockSerializeByValue
      );
      const result = getSerializedStateByReference('abc');
      expect(result).toBe(mockByRefState);
      expect(mockSerializeByReference).toHaveBeenCalledWith('abc');
    });
  });

  describe('getSerializedStateByValue', () => {
    test('delegates to serializeByValue', () => {
      const mockByValueState: MapByValueState = { attributes: mockAttributes };
      mockSerializeByValue.mockReturnValue(mockByValueState);

      const { getSerializedStateByValue } = initializeLibraryTransforms(
        false,
        mockSerializeByReference,
        mockSerializeByValue
      );
      const result = getSerializedStateByValue();
      expect(result).toBe(mockByValueState);
      expect(mockSerializeByValue).toHaveBeenCalled();
    });
  });
});
