/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/monaco';

interface GeneratedImprovement {
  improved_name: string;
  improved_description: string;
  improved_content: string;
  changes_summary: string;
  suggestions: string[];
}

interface SkillImprovementDiffFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  currentContent: string;
  improvement: GeneratedImprovement;
  isReadonly: boolean;
  onApply: () => void;
}

type ViewMode = 'preview' | 'diff';

const editorContainerStyles = css`
  flex: 1;
  min-height: 400px;
  position: relative;

  .monaco-editor,
  .monaco-diff-editor {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }
`;

const flyoutBodyStyles = css`
  .euiFlyoutBody__overflowContent {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
`;

const VIEW_MODE_OPTIONS = [
  {
    id: 'preview' as const,
    label: i18n.translate('xpack.agentBuilder.skills.diffFlyout.previewMode', {
      defaultMessage: 'Preview',
    }),
  },
  {
    id: 'diff' as const,
    label: i18n.translate('xpack.agentBuilder.skills.diffFlyout.diffMode', {
      defaultMessage: 'Diff',
    }),
  },
];

export const SkillImprovementDiffFlyout: React.FC<SkillImprovementDiffFlyoutProps> = ({
  isOpen,
  onClose,
  currentContent,
  improvement,
  isReadonly,
  onApply,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | monaco.editor.IDiffEditor | null>(
    null
  );
  const modelsRef = useRef<{
    original?: monaco.editor.ITextModel;
    modified?: monaco.editor.ITextModel;
  }>({});
  const [viewMode, setViewMode] = useState<ViewMode>('preview');

  // Create/recreate editor when flyout opens or view mode changes
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const container = containerRef.current;
    let disposed = false;

    const initEditor = () => {
      if (disposed) return;

      // Wait for container to have actual dimensions (flyout animation)
      if (!container.offsetWidth || !container.offsetHeight) {
        requestAnimationFrame(initEditor);
        return;
      }

      // Clean up previous editor
      editorRef.current?.dispose();
      modelsRef.current.original?.dispose();
      modelsRef.current.modified?.dispose();

      if (viewMode === 'diff') {
        const originalModel = monaco.editor.createModel(currentContent, 'markdown');
        const modifiedModel = monaco.editor.createModel(improvement.improved_content, 'markdown');

        const diffEditor = monaco.editor.createDiffEditor(container, {
          readOnly: true,
          renderSideBySide: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          folding: true,
          glyphMargin: false,
          overviewRulerLanes: 2,
          hideUnchangedRegions: {
            enabled: true,
            revealLineCount: 3,
            minimumLineCount: 3,
            contextLineCount: 3,
          },
          renderOverviewRuler: true,
          fontSize: 13,
          lineHeight: 20,
          wordWrap: 'on',
          contextmenu: false,
          domReadOnly: true,
          lightbulb: { enabled: false },
          quickSuggestions: false,
          suggestOnTriggerCharacters: false,
          hover: { enabled: false },
          parameterHints: { enabled: false },
          renderIndicators: true,
          renderMarginRevertIcon: false,
          diffAlgorithm: 'advanced',
          ignoreTrimWhitespace: true,
        });

        diffEditor.setModel({ original: originalModel, modified: modifiedModel });
        editorRef.current = diffEditor;
        modelsRef.current = { original: originalModel, modified: modifiedModel };

        // Force layout after editor is mounted
        requestAnimationFrame(() => {
          if (!disposed) diffEditor.layout();
        });
      } else {
        // Preview mode: show improved content in a readonly editor
        const model = monaco.editor.createModel(improvement.improved_content, 'markdown');

        const editor = monaco.editor.create(container, {
          model,
          readOnly: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          folding: true,
          fontSize: 13,
          lineHeight: 20,
          wordWrap: 'on',
          contextmenu: false,
          domReadOnly: true,
          lightbulb: { enabled: false },
          quickSuggestions: false,
          suggestOnTriggerCharacters: false,
          hover: { enabled: false },
          parameterHints: { enabled: false },
        });

        editorRef.current = editor;
        modelsRef.current = { modified: model };

        requestAnimationFrame(() => {
          if (!disposed) editor.layout();
        });
      }
    };

    // Defer to next frame to allow flyout to render
    requestAnimationFrame(initEditor);

    return () => {
      disposed = true;
      editorRef.current?.dispose();
      modelsRef.current.original?.dispose();
      modelsRef.current.modified?.dispose();
      editorRef.current = null;
      modelsRef.current = {};
    };
  }, [isOpen, currentContent, improvement.improved_content, viewMode]);

  // Handle window resize — relayout the editor
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      requestAnimationFrame(() => {
        editorRef.current?.layout();
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  const handleViewModeChange = useCallback((id: string) => {
    setViewMode(id as ViewMode);
  }, []);

  if (!isOpen) return null;

  return (
    <EuiFlyout
      onClose={onClose}
      size="l"
      maxWidth={1400}
      aria-labelledby="skillImprovementDiffTitle"
      data-test-subj="agentBuilderSkillImprovementDiffFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2 id="skillImprovementDiffTitle">
                {i18n.translate('xpack.agentBuilder.skills.diffFlyout.title', {
                  defaultMessage: 'Skill Improvement Preview',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonGroup
              legend={i18n.translate('xpack.agentBuilder.skills.diffFlyout.viewModeLegend', {
                defaultMessage: 'View mode',
              })}
              options={VIEW_MODE_OPTIONS}
              idSelected={viewMode}
              onChange={handleViewModeChange}
              buttonSize="compressed"
              data-test-subj="agentBuilderSkillDiffViewModeToggle"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          {improvement.changes_summary}
        </EuiText>
        {improvement.suggestions.length > 0 && (
          <>
            <EuiSpacer size="xs" />
            <EuiText size="xs" color="subdued">
              <ul>
                {improvement.suggestions.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </EuiText>
          </>
        )}
      </EuiFlyoutHeader>

      <EuiFlyoutBody css={flyoutBodyStyles}>
        <div ref={containerRef} css={editorContainerStyles} />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        {isReadonly && (
          <>
            <EuiCallOut
              size="s"
              color="warning"
              iconType="lock"
              title={i18n.translate('xpack.agentBuilder.skills.diffFlyout.readonlyWarning', {
                defaultMessage:
                  'This is a built-in skill. Applying will create a new user skill with these improvements.',
              })}
            />
            <EuiSpacer size="s" />
          </>
        )}
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onClose}
              data-test-subj="agentBuilderSkillDiffFlyoutCloseButton"
            >
              {i18n.translate('xpack.agentBuilder.skills.diffFlyout.close', {
                defaultMessage: 'Close',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              iconType="check"
              onClick={() => {
                onApply();
                onClose();
              }}
              data-test-subj="agentBuilderSkillDiffFlyoutApplyButton"
            >
              {isReadonly
                ? i18n.translate('xpack.agentBuilder.skills.diffFlyout.createNewSkill', {
                    defaultMessage: 'Create New Skill',
                  })
                : i18n.translate('xpack.agentBuilder.skills.diffFlyout.applyChanges', {
                    defaultMessage: 'Apply Changes',
                  })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
