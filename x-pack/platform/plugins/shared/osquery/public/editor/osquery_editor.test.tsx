/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';

import { OsqueryEditor } from '.';

let mockEditorDidMountCallback: any = null;

vi.mock('@kbn/code-editor', () => {
      const mocked = {
      CodeEditor: (props: any) => {
        // Capture the editorDidMount callback so we can simulate Monaco editor behavior
        if (props.editorDidMount) {
          mockEditorDidMountCallback = props.editorDidMount;
        }

        return (
          <div
            data-test-subj="codeEditor"
            data-height={props.height}
            data-value={props.value}
            data-language={props.languageId}
          >
            <textarea
              data-test-subj="codeEditorInput"
              value={props.value}
              onChange={(e) => props.onChange(e.target.value)}
            />
          </div>
        );
      },
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./osquery_highlight_rules', () => {
      const mocked = {
      initializeOsqueryEditor: vi.fn(() => ({ dispose: vi.fn() })),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./osquery_tables', () => {
      const mocked = {
      useOsqueryTables: vi.fn(() => ({ tableNames: [], tablesRecord: {} })),
    };
      return { ...mocked, default: mocked };
    });

const renderEditor = (props: Partial<React.ComponentProps<typeof OsqueryEditor>> = {}) =>
  render(
    <EuiProvider>
      <OsqueryEditor defaultValue="" onChange={vi.fn()} {...props} />
    </EuiProvider>
  );

describe('OsqueryEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEditorDidMountCallback = null;
  });

  describe('rendering', () => {
    it('should render the code editor with SQL language', () => {
      renderEditor();
      expect(screen.getByTestId('codeEditor')).toHaveAttribute('data-language', 'sql');
    });

    it('should render with default value', () => {
      renderEditor({ defaultValue: 'SELECT * FROM uptime' });
      expect(screen.getByTestId('codeEditor')).toHaveAttribute(
        'data-value',
        'SELECT * FROM uptime'
      );
    });

    it('should render with initial height of 100px', () => {
      renderEditor();
      expect(screen.getByTestId('codeEditor')).toHaveAttribute('data-height', '100px');
    });
  });

  describe('height calculation', () => {
    it('should update height when editor content size changes', () => {
      renderEditor();

      expect(mockEditorDidMountCallback).toBeTruthy();

      let contentSizeChangeHandler: () => void;
      const mockEditor = {
        getContentHeight: vi.fn().mockReturnValue(250),
        onDidContentSizeChange: vi.fn((handler) => {
          contentSizeChangeHandler = handler;
        }),
        addCommand: vi.fn(),
      };

      act(() => {
        mockEditorDidMountCallback(mockEditor);
      });

      act(() => {
        contentSizeChangeHandler();
      });

      expect(screen.getByTestId('codeEditor')).toHaveAttribute('data-height', '250px');
    });

    it('should clamp height to minimum of 100px', () => {
      renderEditor();

      let contentSizeChangeHandler: () => void;
      const mockEditor = {
        getContentHeight: vi.fn().mockReturnValue(50),
        onDidContentSizeChange: vi.fn((handler) => {
          contentSizeChangeHandler = handler;
        }),
        addCommand: vi.fn(),
      };

      act(() => {
        mockEditorDidMountCallback(mockEditor);
      });

      act(() => {
        contentSizeChangeHandler!();
      });

      expect(screen.getByTestId('codeEditor')).toHaveAttribute('data-height', '100px');
    });

    it('should clamp height to maximum of 1000px', () => {
      renderEditor();

      let contentSizeChangeHandler: () => void;
      const mockEditor = {
        getContentHeight: vi.fn().mockReturnValue(2000),
        onDidContentSizeChange: vi.fn((handler) => {
          contentSizeChangeHandler = handler;
        }),
        addCommand: vi.fn(),
      };

      act(() => {
        mockEditorDidMountCallback(mockEditor);
      });

      act(() => {
        contentSizeChangeHandler!();
      });

      expect(screen.getByTestId('codeEditor')).toHaveAttribute('data-height', '1000px');
    });
  });

  describe('commands', () => {
    it('should register submitOnCmdEnter command on mount', () => {
      const execFn = vi.fn();
      renderEditor({ commands: [{ name: 'submitOnCmdEnter', exec: execFn }] });

      const mockEditor = {
        getContentHeight: vi.fn().mockReturnValue(100),
        onDidContentSizeChange: vi.fn(),
        addCommand: vi.fn(),
      };

      act(() => {
        mockEditorDidMountCallback(mockEditor);
      });

      expect(mockEditor.addCommand).toHaveBeenCalledWith(expect.any(Number), execFn);
    });
  });
});
