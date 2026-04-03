/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from '@xstate/react';
import React, { useCallback, useEffect, useRef } from 'react';
import { EuiPanel, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { useFirstMountState } from 'react-use/lib/useFirstMountState';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { isActionBlock } from '@kbn/streamlang';
import {
  useSimulatorSelector,
  useStreamEnrichmentSelector,
} from '../../../state_management/stream_enrichment_state_machine';
import { isRootStep, isStepUnderEdit } from '../../../state_management/steps_state_machine';
import type { StepConfigurationProps } from '../../steps_list';
import type { ProcessorMetrics } from '../../../state_management/simulation_state_machine';
import { ActionBlockEditor } from './editor';
import { ActionBlockListItem } from './list_item';
import { getStepPanelColour } from '../../../utils';
import { selectStreamType } from '../../../state_management/stream_enrichment_state_machine/selectors';

export type ActionBlockProps = StepConfigurationProps & {
  processorMetrics?: ProcessorMetrics;
};
export function ActionBlock(props: StepConfigurationProps) {
  const { stepRef, level, readOnly = false } = props;
  const { euiTheme } = useEuiTheme();
  const isUnderEdit = useSelector(stepRef, (snapshot) => isStepUnderEdit(snapshot));
  const isRootStepValue = useSelector(stepRef, (snapshot) => isRootStep(snapshot));
  const step = useSelector(stepRef, (snapshot) => snapshot.context.step);

  const simulation = useSimulatorSelector((snapshot) => snapshot.context.simulation);

  const streamType = useStreamEnrichmentSelector((snapshot) => selectStreamType(snapshot.context));

  const panelColour = getStepPanelColour(level);

  const processorMetrics = simulation?.processors_metrics[stepRef.id];

  const isFirstMount = useFirstMountState();
  const freshBlockRef = useRef<HTMLDivElement>(null);

  const handlePanelClick = useCallback(() => {
    if (!isUnderEdit && !readOnly) {
      stepRef.send({ type: 'step.edit' });
    }
  }, [isUnderEdit, readOnly, stepRef]);

  useEffect(() => {
    if (isFirstMount && isUnderEdit && freshBlockRef.current) {
      freshBlockRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    }
  }, [isFirstMount, isUnderEdit]);

  const isClickable = !isUnderEdit && !readOnly;

  const panel = (
    <EuiPanel
      data-test-subj="streamsAppProcessorBlock"
      data-stream-type={streamType}
      hasShadow={false}
      color={isUnderEdit && isRootStepValue ? undefined : panelColour}
      onClick={isClickable ? handlePanelClick : undefined}
      css={
        isUnderEdit
          ? css`
              border: 1px solid ${euiTheme.colors.borderStrongPrimary};
              box-sizing: border-box;
              padding: ${euiTheme.size.m};
            `
          : css`
              border: ${euiTheme.border.thin};
              border-radius: ${euiTheme.size.s};
              padding: ${euiTheme.size.m};
              overflow: hidden;
              ${isClickable
                ? `cursor: pointer;`
                : ''}
            `
      }
    >
      {isUnderEdit ? (
        <ActionBlockEditor {...props} ref={freshBlockRef} processorMetrics={processorMetrics} />
      ) : (
        <ActionBlockListItem {...props} processorMetrics={processorMetrics} />
      )}
    </EuiPanel>
  );

  if (isClickable && isActionBlock(step)) {
    return (
      <EuiToolTip
        position="top"
        content={i18n.translate('xpack.streams.actionBlock.tooltip.editProcessorLabel', {
          defaultMessage: 'Edit {stepAction} processor',
          values: { stepAction: step.action },
        })}
        display="block"
      >
        {panel}
      </EuiToolTip>
    );
  }

  return panel;
}
