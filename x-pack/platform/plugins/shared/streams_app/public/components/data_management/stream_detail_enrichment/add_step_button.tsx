/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  useGeneratedHtmlId,
  EuiButton,
  EuiIcon,
  EuiButtonEmpty,
} from '@elastic/eui';
import React from 'react';
import useToggle from 'react-use/lib/useToggle';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  useStreamEnrichmentEvents,
  useStreamEnrichmentSelector,
} from './state_management/stream_enrichment_state_machine';

const createConditionText = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.createConditionButtonText',
  {
    defaultMessage: 'Create condition',
  }
);

const createProcessorText = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.createProcessorButtonText',
  {
    defaultMessage: 'Create processor',
  }
);

const createText = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.createButtonText',
  {
    defaultMessage: 'Add your first step',
  }
);

const addConditionText = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.addConditionButtonText',
  {
    defaultMessage: 'Add condition',
  }
);

const addProcessorText = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.addProcessorButtonText',
  {
    defaultMessage: 'Add processor',
  }
);

const addText = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.addButtonText',
  {
    defaultMessage: 'Add',
  }
);

interface AddStepProps {
  parentId?: string;
  mode: 'inline' | 'subdued' | 'prominent';
}

export const AddStepButton: React.FC<AddStepProps> = ({ parentId, mode }) => {
  const { addProcessor, addCondition } = useStreamEnrichmentEvents();

  const canAddStep = useStreamEnrichmentSelector(
    (state) => state.can({ type: 'step.addProcessor' }) || state.can({ type: 'step.addCondition' })
  );

  const [isPopoverOpen, togglePopover] = useToggle(false);

  const menuPopoverId = useGeneratedHtmlId({
    prefix: 'addStepContextMenuPopover',
  });

  const items = [
    <EuiContextMenuItem
      key="addCondition"
      icon="timeline"
      onClick={() => {
        togglePopover(false);
        addCondition(undefined, { parentId: parentId ?? null });
      }}
    >
      {mode === 'prominent' ? createConditionText : addConditionText}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="addProcessor"
      icon="compute"
      onClick={() => {
        togglePopover(false);
        addProcessor(undefined, { parentId: parentId ?? null });
      }}
    >
      {mode === 'prominent' ? createProcessorText : addProcessorText}
    </EuiContextMenuItem>,
  ];

  const button = (
    <EuiButton
      size="s"
      iconType={mode !== 'prominent' ? 'plusInCircle' : undefined}
      iconSide="left"
      onClick={togglePopover}
      disabled={!canAddStep}
    >
      {mode === 'prominent' ? createText : addText}
      {mode === 'prominent' || mode === 'subdued' ? <EuiIcon type="arrowDown" /> : null}
    </EuiButton>
  );

  const inlineButton = (
    <EuiButtonEmpty
      size="s"
      iconType="plusInCircle"
      iconSide="left"
      onClick={togglePopover}
      disabled={!canAddStep}
      css={css`
        > .euiButtonEmpty__content {
          gap: 0;
        }
      `}
    />
  );

  return (
    <EuiPopover
      id={menuPopoverId}
      button={mode === 'inline' ? inlineButton : button}
      isOpen={isPopoverOpen}
      closePopover={() => togglePopover(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel size="s" items={items} />
    </EuiPopover>
  );
};
