/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isActionBlock, isConditionBlock } from '@kbn/streamlang';
import { useSelector } from '@xstate/react';
import React from 'react';
import useToggle from 'react-use/lib/useToggle';
import { useDiscardConfirm } from '../../../../../hooks/use_discard_confirm';
import { useConditionFilteringEnabled } from '../../hooks/use_condition_filtering_enabled';
import {
  useInteractiveModeSelector,
  useStreamEnrichmentEvents,
  useStreamEnrichmentSelector,
} from '../../state_management/stream_enrichment_state_machine';
import { selectStreamType } from '../../state_management/stream_enrichment_state_machine/selectors';
import { collectDescendantStepIds } from '../../state_management/utils';
import type { StepConfigurationProps } from '../steps_list';
import { EditStepDescriptionModal } from './action/edit_step_description_modal';
import { deleteProcessorPromptOptions } from './action/prompt_options';
import {
  ADD_DESCRIPTION_MENU_LABEL,
  EDIT_DESCRIPTION_MENU_LABEL,
  REMOVE_DESCRIPTION_MENU_LABEL,
} from './action/translations';
import { deleteConditionPromptOptions } from './where/prompt_options';

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
    defaultMessage: 'Edit',
  }
);

const duplicateItemText = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.duplicateItemButtonText',
  {
    defaultMessage: 'Duplicate',
  }
);

const previewConditionOnlyText = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.previewConditionOnlyButtonText',
  {
    defaultMessage: 'Preview this only',
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
  const {
    reorderStep,
    duplicateProcessor,
    filterSimulationByCondition,
    clearSimulationConditionFilter,
  } = useStreamEnrichmentEvents();
  const canEdit = useInteractiveModeSelector((snapshot) => snapshot.can({ type: 'step.edit' }));
  const canDuplicate = useInteractiveModeSelector((snapshot) =>
    snapshot.can({ type: 'step.duplicateProcessor', processorStepId: stepRef.id })
  );
  const canReorder = useInteractiveModeSelector(
    (snapshot) =>
      snapshot.can({ type: 'step.reorder', stepId: stepRef.id, direction: 'up' }) ||
      snapshot.can({ type: 'step.reorder', stepId: stepRef.id, direction: 'down' })
  );
  const canDelete = useInteractiveModeSelector((snapshot) =>
    snapshot.can({ type: 'step.delete', id: stepRef.id })
  );

  const selectedConditionId = useInteractiveModeSelector(
    (snapshot) => snapshot.context.selectedConditionId
  );
  const stepRefs = useInteractiveModeSelector((snapshot) => snapshot.context.stepRefs);
  const steps = stepRefs.map((ref) => ref.getSnapshot().context.step);
  const step = useSelector(stepRef, (snapshot) => snapshot.context.step);

  const streamType = useStreamEnrichmentSelector((snapshot) => selectStreamType(snapshot.context));

  const isWhere = isConditionBlock(step);
  const hasCustomDescription =
    isActionBlock(step) &&
    typeof step.description === 'string' &&
    step.description.trim().length > 0;

  const [isPopoverOpen, togglePopover] = useToggle(false);
  const [isEditDescriptionModalOpen, toggleEditDescriptionModal] = useToggle(false);

  const menuPopoverId = useGeneratedHtmlId({
    prefix: 'stepContextMenuPopover',
  });

  const handleEdit = () => {
    stepRef.send({ type: 'step.edit' });
  };

  const handleDuplicate = () => {
    duplicateProcessor(stepRef.id);
  };

  const getChildStepsLength = () => {
    return !isWhere ? 0 : collectDescendantStepIds(steps, step.customIdentifier).size;
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

  const handleDelete = useDiscardConfirm(
    () => {
      stepRef.send({ type: 'step.delete' });

      if (selectedConditionId === step.customIdentifier) {
        clearSimulationConditionFilter();
      }
    },
    {
      enabled: canDelete,
      ...deletePromptOptions,
    }
  );

  const handleConditionFilter = () => {
    if (selectedConditionId === step.customIdentifier) {
      clearSimulationConditionFilter();
    } else {
      filterSimulationByCondition(step.customIdentifier);
    }
  };

  const isConditionFilteringEnabled = useConditionFilteringEnabled(step.customIdentifier);

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
    ...(!isWhere
      ? hasCustomDescription
        ? [
            <EuiContextMenuItem
              data-test-subj="stepContextMenuEditDescriptionItem"
              key="editDescription"
              icon="editorComment"
              disabled={!canEdit}
              onClick={() => {
                togglePopover(false);
                toggleEditDescriptionModal(true);
              }}
            >
              {EDIT_DESCRIPTION_MENU_LABEL}
            </EuiContextMenuItem>,
            <EuiContextMenuItem
              data-test-subj="stepContextMenuRemoveDescriptionItem"
              key="removeDescription"
              icon="minusInCircle"
              disabled={!canEdit}
              onClick={() => {
                togglePopover(false);
                stepRef.send({ type: 'step.changeDescription', description: '' });
              }}
            >
              {REMOVE_DESCRIPTION_MENU_LABEL}
            </EuiContextMenuItem>,
          ]
        : [
            <EuiContextMenuItem
              data-test-subj="stepContextMenuEditDescriptionItem"
              key="editDescription"
              icon="editorComment"
              disabled={!canEdit}
              onClick={() => {
                togglePopover(false);
                toggleEditDescriptionModal(true);
              }}
            >
              {ADD_DESCRIPTION_MENU_LABEL}
            </EuiContextMenuItem>,
          ]
      : []),
    <EuiContextMenuItem
      data-test-subj="stepContextMenuEditItem"
      data-stream-type={streamType}
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
    ...(!isWhere
      ? [
          <EuiContextMenuItem
            data-test-subj="stepContextMenuDuplicateItem"
            data-stream-type={streamType}
            key="duplicateStep"
            icon="copy"
            disabled={!canDuplicate}
            onClick={() => {
              togglePopover(false);
              handleDuplicate();
            }}
          >
            {duplicateItemText}
          </EuiContextMenuItem>,
        ]
      : []),
    ...(isWhere
      ? [
          <EuiContextMenuItem
            data-test-subj="stepContextMenuPreviewConditionItem"
            key="previewCondition"
            icon="filter"
            disabled={!isConditionFilteringEnabled}
            onClick={() => {
              togglePopover(false);
              handleConditionFilter();
            }}
          >
            {previewConditionOnlyText}
          </EuiContextMenuItem>,
        ]
      : []),
    <EuiContextMenuItem
      data-test-subj="stepContextMenuDeleteItem"
      data-stream-type={streamType}
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
      data-stream-type={streamType}
      disabled={!!stepUnderEdit}
      size="xs"
      iconType="boxesVertical"
      onClick={togglePopover}
    />
  );

  return (
    <>
      <EuiPopover
        id={menuPopoverId}
        data-test-subj="streamsAppStreamDetailEnrichmentStepContextMenuPopover"
        button={button}
        isOpen={isPopoverOpen}
        closePopover={() => togglePopover(false)}
        panelPaddingSize="none"
      >
        <EuiContextMenuPanel size="s" items={items} />
      </EuiPopover>
      {isEditDescriptionModalOpen && !isWhere && isActionBlock(step) && (
        <EditStepDescriptionModal
          step={step}
          onCancel={() => toggleEditDescriptionModal(false)}
          onSave={(description) => {
            toggleEditDescriptionModal(false);
            stepRef.send({ type: 'step.changeDescription', description });
          }}
        />
      )}
    </>
  );
};
