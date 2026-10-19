/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';

jest.mock('@kbn/code-editor', () => {
  const actual = jest.requireActual('@kbn/code-editor');
  return {
    CODE_EDITOR_DEFAULT_THEME_ID: actual.CODE_EDITOR_DEFAULT_THEME_ID,
    initializeRegisteredLanguagesTheme: jest.fn(),
    applyKbnCodeEditorChromeOverrides: jest.fn(() => ({ dispose: jest.fn() })),
    monaco: {
      ...actual.monaco,
      editor: {
        ...actual.monaco.editor,
        createModel: jest.fn(() => ({ dispose: jest.fn() })),
        createDiffEditor: jest.fn(() => ({
          setModel: jest.fn(),
          getContainerDomNode: jest.fn(() => document.createElement('div')),
          dispose: jest.fn(),
        })),
      },
    },
  };
});

// Import after the mock so the mocked module is used.
import {
  applyKbnCodeEditorChromeOverrides,
  CODE_EDITOR_DEFAULT_THEME_ID,
  initializeRegisteredLanguagesTheme,
  monaco,
} from '@kbn/code-editor';
import { SkillDiffViewer, skillDiffChromeOverrides } from './skill_diff_viewer';

const mockCreateDiffEditor = monaco.editor.createDiffEditor as jest.Mock;
const mockInitializeTheme = initializeRegisteredLanguagesTheme as unknown as jest.Mock;
const mockApplyChrome = applyKbnCodeEditorChromeOverrides as jest.Mock;

const renderViewer = (colorMode: 'light' | 'dark' = 'light', afterContent = '# After') => (
  <EuiThemeProvider colorMode={colorMode}>
    <SkillDiffViewer beforeContent="# Before" afterContent={afterContent} showFullContent={false} />
  </EuiThemeProvider>
);

describe('SkillDiffViewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers the shared Kibana theme before creating the editor, and selects it by id', () => {
    render(renderViewer());

    expect(mockInitializeTheme).toHaveBeenCalledTimes(1);
    expect(mockCreateDiffEditor).toHaveBeenCalledTimes(1);
    expect(mockCreateDiffEditor).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ theme: CODE_EDITOR_DEFAULT_THEME_ID })
    );
    expect(mockInitializeTheme.mock.invocationCallOrder[0]).toBeLessThan(
      mockCreateDiffEditor.mock.invocationCallOrder[0]
    );
  });

  it('never defines a theme of its own', () => {
    const defineTheme = jest.spyOn(monaco.editor, 'defineTheme');

    render(renderViewer());

    expect(defineTheme).not.toHaveBeenCalled();
    defineTheme.mockRestore();
  });

  it('applies its chrome to the diff container, and removes it on unmount', () => {
    const dispose = jest.fn();
    mockApplyChrome.mockReturnValueOnce({ dispose });

    const { unmount } = render(renderViewer());

    const diffEditor = mockCreateDiffEditor.mock.results[0].value;
    expect(mockApplyChrome).toHaveBeenCalledWith(
      [diffEditor.getContainerDomNode.mock.results[0].value],
      skillDiffChromeOverrides,
      expect.objectContaining({ euiTheme: expect.any(Object) })
    );

    unmount();

    expect(dispose).toHaveBeenCalled();
    expect(diffEditor.dispose).toHaveBeenCalled();
  });

  it('keeps the editor on a color mode switch and re-applies the chrome', () => {
    const { rerender } = render(renderViewer('light'));
    const appliedBeforeSwitch = mockApplyChrome.mock.calls.length;

    rerender(renderViewer('dark'));

    expect(mockCreateDiffEditor).toHaveBeenCalledTimes(1);
    expect(mockApplyChrome.mock.calls.length).toBeGreaterThan(appliedBeforeSwitch);
  });

  it('re-creates the editor, and re-applies the chrome to it, when the content changes', () => {
    const { rerender } = render(renderViewer('light', '# After'));

    rerender(renderViewer('light', '# After, edited'));

    expect(mockCreateDiffEditor).toHaveBeenCalledTimes(2);
    const secondEditor = mockCreateDiffEditor.mock.results[1].value;
    expect(mockApplyChrome).toHaveBeenLastCalledWith(
      [secondEditor.getContainerDomNode.mock.results[0].value],
      skillDiffChromeOverrides,
      expect.any(Object)
    );
  });
});

describe('skillDiffChromeOverrides', () => {
  it('paints the editor, its gutter and sticky scroll with the code block surface', () => {
    const theme = {
      euiTheme: { components: { codeBackground: '#f5f7fa' } },
    } as unknown as UseEuiTheme;

    expect(skillDiffChromeOverrides(theme)).toEqual({
      'editor.background': '#f5f7fa',
      'editorGutter.background': '#f5f7fa',
      'editorStickyScroll.background': '#f5f7fa',
      'editorStickyScrollGutter.background': '#f5f7fa',
    });
  });
});
