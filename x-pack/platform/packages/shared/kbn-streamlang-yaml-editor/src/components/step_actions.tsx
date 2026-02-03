/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { monaco } from '@kbn/monaco';
import type { SimulationMode } from '../types';
import { getStepActionsStyles } from '../styles';
import { canRunSimulationForStep } from '../utils/can_run_simulation';

export interface StepActionsProps {
  stepId: string;
  lineStart: number;
  onRunUpToStep: (stepId: string) => void;
  canRunSimulation: boolean;
  additiveStepIds: string[];
  editor: monaco.editor.IStandaloneCodeEditor | null;
  simulationMode: SimulationMode;
}

export const StepActions = memo<StepActionsProps>(
  ({
    stepId,
    lineStart,
    onRunUpToStep,
    canRunSimulation,
    additiveStepIds,
    editor,
    simulationMode,
  }) => {
    const { euiTheme } = useEuiTheme();
    const [position, setPosition] = useState<{ top: number; visibility: 'visible' | 'hidden' }>({
      top: 0,
      visibility: 'hidden',
    });

    const componentStyles = useMemo(() => getStepActionsStyles(euiTheme), [euiTheme]);

    // Update position when editor scrolls or line changes
    useEffect(() => {
      if (!editor) {
        setPosition({ top: 0, visibility: 'hidden' });
        return;
      }

      const updatePosition = () => {
        const lineTop = editor.getTopForLineNumber(lineStart);
        const scrollTop = editor.getScrollTop();
        const offset = lineTop - scrollTop;

        // Ensure offset is never less than or equal to zero
        const adjustedOffset = offset <= 0 ? 1 : offset;

        setPosition({
          top: adjustedOffset + 4, // Add small offset for better visual alignment
          visibility: 'visible',
        });
      };

      // Initial position
      updatePosition();

      // Listen to scroll events
      const scrollDisposable = editor.onDidScrollChange(updatePosition);

      // Listen to layout changes (resize, etc.)
      const layoutDisposable = editor.onDidLayoutChange(updatePosition);

      return () => {
        scrollDisposable.dispose();
        layoutDisposable.dispose();
      };
    }, [editor, lineStart]);

    const handleRunClick = useCallback(() => {
      onRunUpToStep(stepId);
    }, [stepId, onRunUpToStep]);

    // Check if simulation can run for this step
    const isAdditiveStep = additiveStepIds.includes(stepId);
    const isCompleteSimulation = simulationMode === 'complete';
    const isButtonEnabled = canRunSimulationForStep({
      canRunSimulation,
      additiveStepIds,
      stepId,
      simulationMode,
    });

    let tooltipContent: string;
    if (!isCompleteSimulation && !isAdditiveStep) {
      tooltipContent = i18n.translate('xpack.streamlang.yamlEditor.stepActions.notAdditiveStep', {
        defaultMessage:
          'Only new steps that add processing without modifying existing behavior can be simulated.',
      });
    } else if (!canRunSimulation) {
      tooltipContent = i18n.translate('xpack.streamlang.yamlEditor.stepActions.cannotRun', {
        defaultMessage:
          "Simulation can't run. Ensure the YAML is valid and changes for partial data sources are strictly additive.",
      });
    } else {
      tooltipContent = i18n.translate('xpack.streamlang.yamlEditor.stepActions.runUpToStep', {
        defaultMessage: 'Run simulation up to this step',
      });
    }

    return (
      <div
        css={componentStyles}
        style={{
          top: `${position.top}px`,
          visibility: position.visibility,
        }}
      >
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={tooltipContent} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="play"
                onClick={handleRunClick}
                color="success"
                data-test-subj="streamlangRunUpToStepButton"
                iconSize="s"
                aria-label={tooltipContent}
                isDisabled={!isButtonEnabled}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }
);
