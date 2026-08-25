/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useCommandMenu } from './use_command_menu';
import { getTextBeforeCursor } from './utils/get_text_before_cursor';

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

  it('disabled option prevents command detection', () => {
    mockGetTextBeforeCursor.mockReturnValue('/summarize');

    const { result } = renderHook(() => useCommandMenu({ enabled: false }));

    act(() => {
      result.current.checkInputForCommand(mockElement);
    });
    expect(result.current.match.isActive).toBe(false);
  });

  describe('no stickiness — a later trigger always wins immediately', () => {
    it('lets a "/" elsewhere in the text win outright, with no memory of an earlier "@" mention', () => {
      mockGetTextBeforeCursor.mockReturnValue('@connector/no_match');
      const { result } = renderHook(() => useCommandMenu());
      act(() => {
        result.current.checkInputForCommand(mockElement);
      });
      expect(result.current.match.activeCommand?.command.id).toBe('sml');

      mockGetTextBeforeCursor.mockReturnValue('@connector/no_match and more /skill');
      act(() => {
        result.current.checkInputForCommand(mockElement);
      });
      expect(result.current.match.activeCommand?.command.id).toBe('skill');
      expect(result.current.match.activeCommand?.query).toBe('skill');
    });
  });

  describe('hasVisibleContent: always visible within the first word', () => {
    it('is visible while still on the first word, before any content is confirmed', () => {
      mockGetTextBeforeCursor.mockReturnValue('@connector/no_match');
      const { result } = renderHook(() => useCommandMenu());
      act(() => {
        result.current.checkInputForCommand(mockElement);
      });

      expect(result.current.match.hasVisibleContent).toBe(true);
    });

    it('stays visible on backspace after being reported empty, so a typo can still be fixed', () => {
      mockGetTextBeforeCursor.mockReturnValue('@connector/no_match');
      const { result } = renderHook(() => useCommandMenu());
      act(() => {
        result.current.checkInputForCommand(mockElement);
      });
      act(() => {
        result.current.reportContent(false, 'connector/no_match');
      });

      mockGetTextBeforeCursor.mockReturnValue('@connector/no_matc');
      act(() => {
        result.current.checkInputForCommand(mockElement);
      });

      expect(result.current.match.activeCommand?.query).toBe('connector/no_matc');
      expect(result.current.match.hasVisibleContent).toBe(true);
    });
  });

  describe('hasVisibleContent: past the first word, defaults to hidden until confirmed', () => {
    it('is hidden by default once a space is crossed, before any confirmation arrives', () => {
      mockGetTextBeforeCursor.mockReturnValue('@connector/no_match ');
      const { result } = renderHook(() => useCommandMenu());
      act(() => {
        result.current.checkInputForCommand(mockElement);
      });

      expect(result.current.match.hasVisibleContent).toBe(false);
    });

    it('becomes visible once a confirmation matching the exact current query arrives', () => {
      mockGetTextBeforeCursor.mockReturnValue('/Skill With');
      const { result } = renderHook(() => useCommandMenu());
      act(() => {
        result.current.checkInputForCommand(mockElement);
      });
      expect(result.current.match.hasVisibleContent).toBe(false);

      act(() => {
        result.current.reportContent(true, 'Skill With');
      });
      expect(result.current.match.hasVisibleContent).toBe(true);
    });

    it('ignores a stale confirmation for a query that has since changed', () => {
      mockGetTextBeforeCursor.mockReturnValue('/Skill With');
      const { result } = renderHook(() => useCommandMenu());
      act(() => {
        result.current.checkInputForCommand(mockElement);
      });

      mockGetTextBeforeCursor.mockReturnValue('/Skill With S');
      act(() => {
        result.current.checkInputForCommand(mockElement);
      });

      act(() => {
        result.current.reportContent(true, 'Skill With');
      });
      expect(result.current.match.hasVisibleContent).toBe(false);

      // The matching confirmation for the CURRENT query does apply.
      act(() => {
        result.current.reportContent(true, 'Skill With S');
      });
      expect(result.current.match.hasVisibleContent).toBe(true);
    });

    it('keeps showing choices across every word of a multi-word skill name, as long as each is confirmed', () => {
      const { result } = renderHook(() => useCommandMenu());
      const steps = ['/Skill', '/Skill With', '/Skill With Spaces'];
      for (const text of steps) {
        mockGetTextBeforeCursor.mockReturnValue(text);
        act(() => {
          result.current.checkInputForCommand(mockElement);
        });
        const query = result.current.match.activeCommand?.query ?? '';
        act(() => {
          result.current.reportContent(true, query);
        });
        expect(result.current.match.hasVisibleContent).toBe(true);
      }
    });

    it('stays hidden across a whole sentence typed after a mention that never gets confirmed', () => {
      const { result } = renderHook(() => useCommandMenu());
      mockGetTextBeforeCursor.mockReturnValue('@connector/no-match');
      act(() => {
        result.current.checkInputForCommand(mockElement);
      });
      act(() => {
        result.current.reportContent(false, 'connector/no-match');
      });

      const sentence = '@connector/no-match this is not a match';
      for (let end = '@connector/no-match'.length + 1; end <= sentence.length; end++) {
        mockGetTextBeforeCursor.mockReturnValue(sentence.slice(0, end));
        act(() => {
          result.current.checkInputForCommand(mockElement);
        });
        expect(result.current.match.hasVisibleContent).toBe(false);
      }
    });
  });
});
