/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import {
  getAddCustomContentAction,
  ADD_CUSTOM_CONTENT_ACTION_ID,
} from './add_custom_content_action';
import { CustomContentIcon } from './custom_content_icon';

jest.mock('@kbn/presentation-publishing', () => ({
  apiIsPresentationContainer: jest.fn(),
  hasEditCapabilities: jest.fn(),
}));

import { apiIsPresentationContainer, hasEditCapabilities } from '@kbn/presentation-publishing';

const mockApiIsPresentationContainer = apiIsPresentationContainer as jest.MockedFunction<
  typeof apiIsPresentationContainer
>;
const mockHasEditCapabilities = hasEditCapabilities as jest.MockedFunction<
  typeof hasEditCapabilities
>;

describe('getAddCustomContentAction', () => {
  const action = getAddCustomContentAction();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has the correct id', () => {
    expect(action.id).toBe(ADD_CUSTOM_CONTENT_ACTION_ID);
  });

  it('has order -1 (below Vega)', () => {
    expect(action.order).toBe(-1);
  });

  it('returns the correct display name', () => {
    expect(action.getDisplayName!({} as any)).toBe('Custom');
  });

  it('returns CustomContentIcon as the icon type', () => {
    expect(action.getIconType!({} as any)).toBe(CustomContentIcon);
  });

  describe('isCompatible', () => {
    it('returns true for a presentation container', async () => {
      mockApiIsPresentationContainer.mockReturnValue(true);
      const result = await action.isCompatible!({ embeddable: {} } as any);
      expect(result).toBe(true);
    });

    it('returns false when the embeddable is not a presentation container', async () => {
      mockApiIsPresentationContainer.mockReturnValue(false);
      const result = await action.isCompatible!({ embeddable: {} } as any);
      expect(result).toBe(false);
    });
  });

  describe('execute', () => {
    it('throws IncompatibleActionError when embeddable is not a presentation container', async () => {
      mockApiIsPresentationContainer.mockReturnValue(false);
      await expect(action.execute({ embeddable: {} } as any)).rejects.toThrow(
        IncompatibleActionError
      );
    });

    it('calls addNewPanel and then onEdit on the returned api', async () => {
      const mockOnEdit = jest.fn().mockResolvedValue(undefined);
      const mockPanelApi = { onEdit: mockOnEdit };
      const mockAddNewPanel = jest.fn().mockResolvedValue(mockPanelApi);
      const mockEmbeddable = { addNewPanel: mockAddNewPanel };

      mockApiIsPresentationContainer.mockReturnValue(true);
      mockHasEditCapabilities.mockReturnValue(true);

      await action.execute({ embeddable: mockEmbeddable } as any);

      expect(mockAddNewPanel).toHaveBeenCalledWith(
        expect.objectContaining({ panelType: 'custom_content' }),
        { displaySuccessMessage: false }
      );
      expect(mockOnEdit).toHaveBeenCalledWith({ isNewPanel: true, returnFocus: undefined });
    });

    it('does not call onEdit when addNewPanel returns undefined', async () => {
      const mockAddNewPanel = jest.fn().mockResolvedValue(undefined);
      const mockEmbeddable = { addNewPanel: mockAddNewPanel };

      mockApiIsPresentationContainer.mockReturnValue(true);
      mockHasEditCapabilities.mockReturnValue(false);

      await action.execute({ embeddable: mockEmbeddable } as any);

      expect(mockAddNewPanel).toHaveBeenCalled();
    });
  });
});
