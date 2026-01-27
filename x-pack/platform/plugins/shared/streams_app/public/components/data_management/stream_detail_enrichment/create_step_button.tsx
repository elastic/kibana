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
  EuiButtonIcon,
} from '@elastic/eui';
import React from 'react';
import useToggle from 'react-use/lib/useToggle';
import { i18n } from '@kbn/i18n';
import {
  useInteractiveModeSelector,
  useStreamEnrichmentEvents,
  useStreamEnrichmentSelector,
} from './state_management/stream_enrichment_state_machine';
import { selectStreamType } from './state_management/stream_enrichment_state_machine/selectors';

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

const createTextProminent = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.createButtonTextProminent',
  {
    defaultMessage: 'Create your first step',
  }
);

const createText = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.addButtonText',
  {
    defaultMessage: 'Create',
  }
);

interface AddStepProps {
  parentId?: string;
  mode: 'inline' | 'subdued' | 'prominent';
  nestingDisabled?: boolean;
}

export const CreateStepButton: React.FC<AddStepProps> = ({
  parentId,
  mode,
  nestingDisabled = false,
}) => {
  const { addProcessor, addCondition } = useStreamEnrichmentEvents();

  const canAddStep = useInteractiveModeSelector(
    (state) => state.can({ type: 'step.addProcessor' }) || state.can({ type: 'step.addCondition' })
  );

  const streamType = useStreamEnrichmentSelector((snapshot) => selectStreamType(snapshot.context));

  const [isPopoverOpen, togglePopover] = useToggle(false);

  const menuPopoverId = useGeneratedHtmlId({
    prefix: 'addStepContextMenuPopover',
  });

  const items = [
    <EuiContextMenuItem
      data-test-subj="streamsAppStreamDetailEnrichmentCreateStepButtonAddCondition"
      data-stream-type={streamType}
      key="addCondition"
      icon="timeline"
      disabled={nestingDisabled}
      onClick={() => {
        togglePopover(false);
        addCondition(undefined, { parentId: parentId ?? null });
      }}
    >
      {createConditionText}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      data-test-subj="streamsAppStreamDetailEnrichmentCreateStepButtonAddProcessor"
      data-stream-type={streamType}
      key="addProcessor"
      icon="compute"
      onClick={() => {
        togglePopover(false);
        addProcessor(undefined, { parentId: parentId ?? null });
      }}
    >
      {createProcessorText}
    </EuiContextMenuItem>,
  ];

  const button = canAddStep && (
    <EuiButton
      size="s"
      onClick={togglePopover}
      data-test-subj="streamsAppStreamDetailEnrichmentCreateStepButton"
      data-stream-type={streamType}
    >
      {mode === 'prominent' ? createTextProminent : createText}
      {mode === 'prominent' || mode === 'subdued' ? <EuiIcon type="arrowDown" /> : null}
    </EuiButton>
  );

  const inlineButton = (
    <EuiButtonIcon
      data-test-subj="streamsAppStreamDetailEnrichmentCreateStepButtonInline"
      data-stream-type={streamType}
      size="xs"
      iconType="plusInCircle"
      onClick={togglePopover}
      disabled={!canAddStep}
      aria-label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.createStepButtonInlineAriaLabel',
        {
          defaultMessage: 'Create nested step',
        }
      )}
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
