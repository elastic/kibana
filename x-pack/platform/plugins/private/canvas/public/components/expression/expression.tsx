/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useRef } from 'react';
import {
  EuiPanel,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiLink,
  EuiPortal,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/monaco';

import type {
  ExpressionInputEditorRef,
  OnExpressionInputEditorDidMount,
} from '../expression_input/types';
import { ExpressionInput } from '../expression_input';
import { ToolTipShortcut } from '../tool_tip_shortcut';
import type { ExpressionFunction } from '../../../types';
import type { FormState } from '.';
import { coreServices } from '../../services/kibana_services';
import { ShortcutStrings } from '../../../i18n/shortcuts';

const shortcutHelp = ShortcutStrings.getShortcutHelp();
const namespaceDisplayNames = ShortcutStrings.getNamespaceDisplayNames();

const strings = {
  getCancelButtonLabel: () =>
    i18n.translate('xpack.canvas.expression.cancelButtonLabel', {
      defaultMessage: 'Cancel',
    }),
  getCloseButtonLabel: () =>
    i18n.translate('xpack.canvas.expression.closeButtonLabel', {
      defaultMessage: 'Close',
    }),
  getLearnLinkText: () =>
    i18n.translate('xpack.canvas.expression.learnLinkText', {
      defaultMessage: 'Learn expression syntax',
    }),
  getMaximizeButtonLabel: () =>
    i18n.translate('xpack.canvas.expression.maximizeButtonLabel', {
      defaultMessage: 'Maximize editor',
    }),
  getMinimizeButtonLabel: () =>
    i18n.translate('xpack.canvas.expression.minimizeButtonLabel', {
      defaultMessage: 'Minimize Editor',
    }),
  getRunButtonLabel: () =>
    i18n.translate('xpack.canvas.expression.runButtonLabel', {
      defaultMessage: 'Run',
    }),
  getRunTooltip: () =>
    i18n.translate('xpack.canvas.expression.runTooltip', {
      defaultMessage: 'Run the expression',
    }),
};

interface Props {
  functionDefinitions: ExpressionFunction[];
  formState: FormState;
  updateValue: (expression?: string) => void;
  setExpression: (expression: string) => void;
  done: () => void;
  error?: string;
  isCompact: boolean;
  toggleCompactView: () => void;
}

export const Expression: FC<Props> = ({
  functionDefinitions,
  formState,
  updateValue,
  setExpression,
  done,
  error,
  isCompact,
  toggleCompactView,
}) => {
  const refExpressionInput: ExpressionInputEditorRef = useRef(null);
  const propsRef = useRef({ formState, setExpression, error, isCompact, toggleCompactView });
  propsRef.current = { formState, setExpression, error, isCompact, toggleCompactView };

  useEffect(() => {
    const handle = coreServices.hotkeys.register(
      {
        id: 'canvas:expression.run',
        keys: 'Mod+Enter',
        label: shortcutHelp.RUN,
        scope: 'context',
        group: namespaceDisplayNames.EXPRESSION,
      },
      (event) => {
        const isInputActive =
          refExpressionInput.current && refExpressionInput.current.hasTextFocus();
        if (!isInputActive) return;
        event.preventDefault();
        if (!propsRef.current.error) {
          propsRef.current.setExpression(propsRef.current.formState.expression);
        }
      }
    );
    return handle.unregister;
  }, []);

  const handleRun = () => {
    setExpression(formState.expression);
    // If fullScreen and you hit run, toggle back down so you can see your work
    if (!isCompact && !error) {
      toggleCompactView();
    }
  };

  const onEditorDidMount: OnExpressionInputEditorDidMount = (editor) => {
    /*
      To enable the CMD+ENTER keybinding, which is running the expression,
      it is necessary to disable the `-editor.action.insertLineAfter`,
      which has the same keybinding in the Monaco editor.
      The only available way is adding the empty dynamic keybinding
      (by using private monaco API, proposed by the monaco team), which is bubbling the event.
    */
    // @ts-expect-error
    editor?._standaloneKeybindingService.addDynamicKeybinding(
      '-editor.action.insertLineAfter',
      // eslint-disable-next-line no-bitwise
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => {}
    );
  };

  const expressionPanel = (
    <EuiPanel
      className={`canvasTray__panel canvasTray__panel--holdingExpression canvasExpression--${
        isCompact ? 'compactSize' : 'fullSize'
      }`}
      paddingSize="none"
    >
      {/* Error code below is to pass a non breaking space so the editor does not jump */}

      <ExpressionInput
        isCompact={isCompact}
        expressionFunctions={functionDefinitions}
        error={error ? error : `\u00A0`}
        expression={formState.expression}
        onChange={updateValue}
        onEditorDidMount={onEditorDidMount}
        editorRef={refExpressionInput}
      />
      <div className="canvasExpression__settings">
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={
                    <span>
                      {strings.getRunTooltip()}{' '}
                      <ToolTipShortcut namespace="EXPRESSION" action="RUN" />
                    </span>
                  }
                >
                  <EuiButton fill disabled={!!error} onClick={handleRun} size="s">
                    {strings.getRunButtonLabel()}
                  </EuiButton>
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  color={formState.dirty ? 'danger' : 'primary'}
                  onClick={done}
                >
                  {formState.dirty ? strings.getCancelButtonLabel() : strings.getCloseButtonLabel()}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiLink
                  href="https://www.elastic.co/guide/en/kibana/current/canvas-function-reference.html"
                  target="_blank"
                >
                  {strings.getLearnLinkText()}
                </EuiLink>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty iconType="fullScreen" onClick={toggleCompactView} size="s">
                  {isCompact ? strings.getMaximizeButtonLabel() : strings.getMinimizeButtonLabel()}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPanel>
  );

  if (isCompact) {
    return expressionPanel;
  } else {
    // Portal is required to show above the navigation
    return <EuiPortal>{expressionPanel}</EuiPortal>;
  }
};
