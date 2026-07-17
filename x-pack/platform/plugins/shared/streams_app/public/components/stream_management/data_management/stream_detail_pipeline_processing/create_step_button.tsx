/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiIcon,
  EuiPopover,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React from 'react';
import useToggle from 'react-use/lib/useToggle';
import { i18n } from '@kbn/i18n';
import type { PipelineStepBranch } from './types';
import { useKibana } from '../../../../hooks/use_kibana';
import {
  useInteractiveModeSelector,
  useStreamEnrichmentEvents,
  useStreamEnrichmentSelector,
} from './state_management/stream_enrichment_state_machine';
import { selectStreamType } from './state_management/stream_enrichment_state_machine/selectors';

const createProcessorText = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.createProcessorButtonText',
  {
    defaultMessage: 'Create processor',
  }
);

const createConditionText = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.createConditionButtonText',
  {
    defaultMessage: 'Create condition',
  }
);

const unsupportedConditionMessage = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.createConditionUnsupportedMessage',
  {
    defaultMessage: 'Conditions are not supported in ingest pipelines yet.',
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
  branch?: PipelineStepBranch;
  mode: 'inline' | 'subdued' | 'prominent';
  nestingDisabled?: boolean;
}

export const CreateStepButton: React.FC<AddStepProps> = ({ parentId, branch, mode }) => {
  const {
    core: { notifications },
  } = useKibana();
  const { addProcessor } = useStreamEnrichmentEvents();

  const canAddStep = useInteractiveModeSelector((state) =>
    state.can({ type: 'step.addProcessor' })
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
      onClick={() => {
        togglePopover(false);
        notifications.toasts.addWarning(unsupportedConditionMessage);
      }}
    >
      {createConditionText}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      data-test-subj="streamsAppStreamDetailEnrichmentCreateStepButtonAddProcessor"
      data-stream-type={streamType}
      key="addProcessor"
      icon="processor"
      onClick={() => {
        togglePopover(false);
        addProcessor(undefined, { parentId: parentId ?? null, branch });
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
      {mode === 'prominent' || mode === 'subdued' ? (
        <EuiIcon type="chevronSingleDown" aria-hidden={true} />
      ) : null}
    </EuiButton>
  );

  const inlineButton = (
    <EuiToolTip
      content={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.createStepButtonInlineAriaLabel',
        {
          defaultMessage: 'Create nested step',
        }
      )}
      disableScreenReaderOutput
    >
      <EuiButtonIcon
        data-test-subj="streamsAppStreamDetailEnrichmentCreateStepButtonInline"
        data-stream-type={streamType}
        size="xs"
        iconType="plusCircle"
        onClick={togglePopover}
        disabled={!canAddStep}
        aria-label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.createStepButtonInlineAriaLabel',
          {
            defaultMessage: 'Create nested step',
          }
        )}
      />
    </EuiToolTip>
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
      <EuiContextMenuPanel items={items} />
    </EuiPopover>
  );
};
