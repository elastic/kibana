/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { getAddCustomContentAction } from './add_custom_content_action';
import { ADD_CUSTOM_CONTENT_ACTION_ID } from '../../common/constants';
import { CustomContentIcon } from './custom_content_icon';
import { apiIsPresentationContainer, hasEditCapabilities } from '@kbn/presentation-publishing';

vi.mock('@kbn/presentation-publishing', () => {
  const mocked = {
    apiIsPresentationContainer: vi.fn(),
    hasEditCapabilities: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const mockTrackPanelAdded = vi.fn();

vi.mock('../telemetry', () => {
  const mocked = {
    getTelemetry: () => ({ trackPanelAdded: mockTrackPanelAdded }),
  };
  return { ...mocked, default: mocked };
});

const mockApiIsPresentationContainer = apiIsPresentationContainer as MockedFunction<
  typeof apiIsPresentationContainer
>;
const mockHasEditCapabilities = hasEditCapabilities as MockedFunction<typeof hasEditCapabilities>;

describe('getAddCustomContentAction', () => {
  const action = getAddCustomContentAction();

  beforeEach(() => {
    vi.clearAllMocks();
    mockTrackPanelAdded.mockReset();
  });

  it('has the correct id', () => {
    expect(action.id).toBe(ADD_CUSTOM_CONTENT_ACTION_ID);
  });

  it('has order -1 (below Vega)', () => {
    expect(action.order).toBe(-1);
  });

  it('returns the correct display name', () => {
    expect(action.getDisplayName!({ embeddable: {} })).toBe('Custom');
  });

  it('returns CustomContentIcon as the icon type', () => {
    expect(action.getIconType!({ embeddable: {} })).toBe(CustomContentIcon);
  });

  it('renders a New badge next to the display name', () => {
    const MenuItem = action.MenuItem!;
    render(
      <I18nProvider>
        <MenuItem context={{ embeddable: {} }} />
      </I18nProvider>
    );
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  describe('isCompatible', () => {
    it('returns true for a presentation container', async () => {
      mockApiIsPresentationContainer.mockReturnValue(true);
      const result = await action.isCompatible!({ embeddable: {} });
      expect(result).toBe(true);
    });

    it('returns false when the embeddable is not a presentation container', async () => {
      mockApiIsPresentationContainer.mockReturnValue(false);
      const result = await action.isCompatible!({ embeddable: {} });
      expect(result).toBe(false);
    });
  });

  describe('execute', () => {
    it('throws IncompatibleActionError when embeddable is not a presentation container', async () => {
      mockApiIsPresentationContainer.mockReturnValue(false);
      await expect(action.execute({ embeddable: {} })).rejects.toThrow(IncompatibleActionError);
    });

    it('calls addNewPanel and then onEdit on the returned api', async () => {
      const mockOnEdit = vi.fn().mockResolvedValue(undefined);
      const mockPanelApi = { onEdit: mockOnEdit };
      const mockAddNewPanel = vi.fn().mockResolvedValue(mockPanelApi);
      const mockEmbeddable = { addNewPanel: mockAddNewPanel };

      mockApiIsPresentationContainer.mockReturnValue(true);
      mockHasEditCapabilities.mockReturnValue(true);

      await action.execute({ embeddable: mockEmbeddable });

      expect(mockTrackPanelAdded).toHaveBeenCalledWith('dashboard_panel');
      expect(mockAddNewPanel).toHaveBeenCalledWith(
        expect.objectContaining({ panelType: 'custom_content' }),
        { displaySuccessMessage: false }
      );
      expect(mockOnEdit).toHaveBeenCalledWith({ isNewPanel: true, returnFocus: undefined });
    });

    it('does not call onEdit when addNewPanel returns undefined', async () => {
      const mockAddNewPanel = vi.fn().mockResolvedValue(undefined);
      const mockEmbeddable = { addNewPanel: mockAddNewPanel };

      mockApiIsPresentationContainer.mockReturnValue(true);
      mockHasEditCapabilities.mockReturnValue(false);

      await action.execute({ embeddable: mockEmbeddable });

      expect(mockAddNewPanel).toHaveBeenCalled();
    });
  });
});
