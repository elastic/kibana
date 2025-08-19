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
} from '@elastic/eui';
import React from 'react';
import useToggle from 'react-use/lib/useToggle';
import { i18n } from '@kbn/i18n';
import {
  useStreamEnrichmentEvents,
  useStreamEnrichmentSelector,
} from './state_management/stream_enrichment_state_machine';

const createConditionText = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.addConditionButtonText',
  {
    defaultMessage: 'Create condition',
  }
);

const createProcessorText = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.addProcessorButtonText',
  {
    defaultMessage: 'Create processor',
  }
);

const createText = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.createButtonText',
  {
    defaultMessage: 'Create',
  }
);

interface AddStepProps {
  parentId?: string;
}

export const AddStepButton: React.FC<AddStepProps> = ({ parentId }) => {
  const { addProcessor, addCondition } = useStreamEnrichmentEvents();

  const canAddStep = useStreamEnrichmentSelector(
    (state) => state.can({ type: 'step.addProcessor' }) || state.can({ type: 'step.addCondition' })
  );

  const [isPopoverOpen, togglePopover] = useToggle(false);

  const menuPopoverId = useGeneratedHtmlId({
    prefix: 'smallContextMenuPopover',
  });

  const items = [
    <EuiContextMenuItem
      key="edit"
      icon="pencil"
      onClick={() => {
        togglePopover(false);
        addCondition(undefined, { parentId: parentId ?? null });
      }}
    >
      {createConditionText}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="share"
      icon="share"
      onClick={() => {
        togglePopover(false);
        addProcessor(undefined, { parentId: parentId ?? null });
      }}
    >
      {createProcessorText}
    </EuiContextMenuItem>,
  ];

  const button = (
    <EuiButton
      size="s"
      iconType="plus"
      iconSide="right"
      onClick={togglePopover}
      disabled={!canAddStep}
    >
      {createText}
    </EuiButton>
  );

  return (
    <EuiPopover
      id={menuPopoverId}
      button={button}
      isOpen={isPopoverOpen}
      closePopover={() => togglePopover(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel size="s" items={items} />
    </EuiPopover>
  );
};
