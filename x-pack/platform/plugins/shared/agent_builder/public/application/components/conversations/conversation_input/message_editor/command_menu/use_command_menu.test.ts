/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useCommandMenu } from './use_command_menu';
import { getTextBeforeCursor } from './utils/get_text_before_cursor';

jest.mock('../../../../../hooks/use_context_engine_enabled', () => ({
  useContextEngineEnabled: () => true,
}));

jest.mock('../../../../../hooks/use_experimental_features', () => ({
  useExperimentalFeatures: () => true,
}));

jest.mock('./utils/get_text_before_cursor');
const mockGetTextBeforeCursor = jest.mocked(getTextBeforeCursor);

const mockElement = document.createElement('div');

describe('useCommandMenuCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns inactive match initially', () => {
    const { result } = renderHook(() => useCommandMenu());

    expect(result.current.match.isActive).toBe(false);
    expect(result.current.match.activeCommand).toBeNull();
  });

  it('detects command on handleInput', () => {
    mockGetTextBeforeCursor.mockReturnValue('/');

    const { result } = renderHook(() => useCommandMenu());

    act(() => {
      result.current.checkInputForCommand(mockElement);
    });

    expect(result.current.match.isActive).toBe(true);
    expect(result.current.match.activeCommand?.command.id).toBe('skill');
    expect(result.current.match.activeCommand?.query).toBe('');
  });

  it('updates query as user types after command', () => {
    mockGetTextBeforeCursor.mockReturnValue('/sum');

    const { result } = renderHook(() => useCommandMenu());

    act(() => {
      result.current.checkInputForCommand(mockElement);
    });

    expect(result.current.match.isActive).toBe(true);
    expect(result.current.match.activeCommand?.query).toBe('sum');
  });

  it('keeps command active when query contains whitespace', () => {
    const { result } = renderHook(() => useCommandMenu());

    mockGetTextBeforeCursor.mockReturnValue('/summarize');
    act(() => {
      result.current.checkInputForCommand(mockElement);
    });
    expect(result.current.match.isActive).toBe(true);

    mockGetTextBeforeCursor.mockReturnValue('/summarize ');
    act(() => {
      result.current.checkInputForCommand(mockElement);
    });
    expect(result.current.match.isActive).toBe(true);
    expect(result.current.match.activeCommand?.query).toBe('summarize ');
  });

  it('dismiss() deactivates the current command', () => {
    mockGetTextBeforeCursor.mockReturnValue('/summarize');

    const { result } = renderHook(() => useCommandMenu());

    act(() => {
      result.current.checkInputForCommand(mockElement);
    });
    expect(result.current.match.isActive).toBe(true);

    act(() => {
      result.current.dismiss();
    });
    expect(result.current.match.isActive).toBe(false);
  });

  it('dismissed command re-activates on next input', () => {
    const { result } = renderHook(() => useCommandMenu());

    mockGetTextBeforeCursor.mockReturnValue('/summarize');
    act(() => {
      result.current.checkInputForCommand(mockElement);
    });

    act(() => {
      result.current.dismiss();
    });
    expect(result.current.match.isActive).toBe(false);

    // User continues typing — command re-activates
    mockGetTextBeforeCursor.mockReturnValue('/summarize t');
    act(() => {
      result.current.checkInputForCommand(mockElement);
    });
    expect(result.current.match.isActive).toBe(true);
    expect(result.current.match.activeCommand?.query).toBe('summarize t');
  });

  describe('stickiness release once content is confirmed empty', () => {
    it('stays sticky to the active command by default, even when another trigger is closer', () => {
      mockGetTextBeforeCursor.mockReturnValue('@foo');
      const { result } = renderHook(() => useCommandMenu());
      act(() => {
        result.current.checkInputForCommand(mockElement);
      });
      expect(result.current.match.activeCommand?.command.id).toBe('sml');

      // A "/" now appears closer to the cursor, but nothing has reported
      // this mention dead yet, so it stays sticky to "sml".
      mockGetTextBeforeCursor.mockReturnValue('@foo /bar');
      act(() => {
        result.current.checkInputForCommand(mockElement);
      });
      expect(result.current.match.activeCommand?.command.id).toBe('sml');
      expect(result.current.match.activeCommand?.query).toBe('foo /bar');
    });

    it('releases stickiness once reportContent(false) confirms the mention is dead, letting a later trigger win', () => {
      mockGetTextBeforeCursor.mockReturnValue('@foo');
      const { result } = renderHook(() => useCommandMenu());
      act(() => {
        result.current.checkInputForCommand(mockElement);
      });
      expect(result.current.match.activeCommand?.command.id).toBe('sml');

      act(() => {
        result.current.reportContent(false);
      });

      // The "@" mention is now known-dead. A "/" typed later in the text
      // should win outright instead of being blocked by stale stickiness.
      mockGetTextBeforeCursor.mockReturnValue('@foo /bar');
      act(() => {
        result.current.checkInputForCommand(mockElement);
      });
      expect(result.current.match.activeCommand?.command.id).toBe('skill');
      expect(result.current.match.activeCommand?.query).toBe('bar');
    });

    it('resets the content assumption to true for a genuinely new mention', () => {
      mockGetTextBeforeCursor.mockReturnValue('/summarize');
      const { result } = renderHook(() => useCommandMenu());
      act(() => {
        result.current.checkInputForCommand(mockElement);
      });

      act(() => {
        result.current.reportContent(false);
      });

      // A different "/" mention starts at a new offset (e.g. the old one
      // was deleted and a new one typed) — it should not inherit the old
      // mention's "dead" status.
      mockGetTextBeforeCursor.mockReturnValue(' /other');
      act(() => {
        result.current.checkInputForCommand(mockElement);
      });
      expect(result.current.match.activeCommand?.commandStartOffset).toBe(1);
      expect(result.current.match.hasVisibleContent).toBe(true);
    });
  });

  it('disabled option prevents command detection', () => {
    mockGetTextBeforeCursor.mockReturnValue('/summarize');

    const { result } = renderHook(() => useCommandMenu({ enabled: false }));

    act(() => {
      result.current.checkInputForCommand(mockElement);
    });
    expect(result.current.match.isActive).toBe(false);
  });
});
