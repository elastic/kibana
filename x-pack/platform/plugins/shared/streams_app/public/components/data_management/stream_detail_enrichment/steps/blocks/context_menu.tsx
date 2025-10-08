/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiContextMenuItem,
  EuiPopover,
  EuiContextMenuPanel,
  useGeneratedHtmlId,
  EuiButtonIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import useToggle from 'react-use/lib/useToggle';
import { useSelector } from '@xstate5/react';
import { isWhereBlock } from '@kbn/streamlang';
import { useDiscardConfirm } from '../../../../../hooks/use_discard_confirm';
import {
  useStreamEnrichmentEvents,
  useStreamEnrichmentSelector,
} from '../../state_management/stream_enrichment_state_machine';
import { deleteProcessorPromptOptions } from './action/prompt_options';
import { deleteConditionPromptOptions } from './where/prompt_options';
import { collectDescendantIds } from '../../state_management/stream_enrichment_state_machine/utils';
import type { StepConfigurationProps } from '../steps_list';

const moveUpItemText = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.moveUpItemButtonText',
  {
    defaultMessage: 'Move up',
  }
);

const moveDownItemText = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.moveDownItemButtonText',
  {
    defaultMessage: 'Move down',
  }
);

const editItemText = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.editItemButtonText',
  {
    defaultMessage: 'Edit item',
  }
);

const deleteItemText = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.deleteItemButtonText',
  {
    defaultMessage: 'Delete',
  }
);

type StepContextMenuProps = Pick<
  StepConfigurationProps,
  'stepRef' | 'stepUnderEdit' | 'isFirstStepInLevel' | 'isLastStepInLevel'
>;

export const StepContextMenu: React.FC<StepContextMenuProps> = ({
  stepRef,
  stepUnderEdit,
  isFirstStepInLevel,
  isLastStepInLevel,
}) => {
  const { reorderStep } = useStreamEnrichmentEvents();
  const canEdit = useStreamEnrichmentSelector((snapshot) => snapshot.can({ type: 'step.edit' }));
  const canReorder = useStreamEnrichmentSelector(
    (snapshot) =>
      snapshot.can({ type: 'step.reorder', stepId: stepRef.id, direction: 'up' }) ||
      snapshot.can({ type: 'step.reorder', stepId: stepRef.id, direction: 'down' })
  );
  const canDelete = useSelector(stepRef, (snapshot) => {
    return snapshot.can({ type: 'step.delete' });
  });

  const stepRefs = useStreamEnrichmentSelector((snapshot) => snapshot.context.stepRefs);

  const step = useSelector(stepRef, (snapshot) => snapshot.context.step);

  const isWhere = isWhereBlock(step);

  const [isPopoverOpen, togglePopover] = useToggle(false);

  const menuPopoverId = useGeneratedHtmlId({
    prefix: 'stepContextMenuPopover',
  });

  const handleEdit = () => {
    stepRef.send({ type: 'step.edit' });
  };

  const getChildStepsLength = () => {
    return !isWhere ? 0 : collectDescendantIds(step.customIdentifier, stepRefs).size;
  };

  const deletePromptOptions = !isWhere
    ? deleteProcessorPromptOptions
    : {
        ...deleteConditionPromptOptions,
        message: i18n.translate('xpack.streams.enrichment.condition.deleteCondition.message', {
          defaultMessage:
            'If you delete this condition, you will also remove the {childCount} {childCount, plural, one {child} other {children}} in it. Are you sure you want to remove this?',
          values: {
            childCount: getChildStepsLength(),
          },
        }),
      };

  const handleDelete = useDiscardConfirm(() => stepRef.send({ type: 'step.delete' }), {
    enabled: canDelete,
    ...deletePromptOptions,
  });

  const items = [
    <EuiContextMenuItem
      data-test-subj="stepContextMenuMoveUpItem"
      key="moveUpItem"
      icon="arrowUp"
      disabled={!canReorder || isFirstStepInLevel}
      onClick={() => {
        togglePopover(false);
        reorderStep(stepRef.id, 'up');
      }}
    >
      {moveUpItemText}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      data-test-subj="stepContextMenuMoveDownItem"
      key="moveDownItem"
      icon="arrowDown"
      disabled={!canReorder || isLastStepInLevel}
      onClick={() => {
        togglePopover(false);
        reorderStep(stepRef.id, 'down');
      }}
    >
      {moveDownItemText}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      data-test-subj="stepContextMenuEditItem"
      key="editItem"
      icon="pencil"
      disabled={!canEdit}
      onClick={() => {
        togglePopover(false);
        handleEdit();
      }}
    >
      {editItemText}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      data-test-subj="stepContextMenuDeleteItem"
      key="deleteStep"
      icon="trash"
      disabled={!canDelete}
      onClick={() => {
        togglePopover(false);
        handleDelete();
      }}
    >
      {deleteItemText}
    </EuiContextMenuItem>,
  ];

  const button = (
    <EuiButtonIcon
      aria-label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.stepContextMenuButtonAriaLabel',
        {
          defaultMessage: 'Step context menu',
        }
      )}
      data-test-subj="streamsAppStreamDetailEnrichmentStepContextMenuButton"
      disabled={!!stepUnderEdit}
      size="xs"
      iconType="boxesVertical"
      onClick={togglePopover}
    />
  );

  return (
    <EuiPopover
      id={menuPopoverId}
      button={button}
      isOpen={isPopoverOpen}
      closePopover={() => togglePopover(false)}
      panelPaddingSize="none"
    >
      <EuiContextMenuPanel size="s" items={items} />
    </EuiPopover>
  );
};
