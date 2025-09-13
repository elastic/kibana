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
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import useToggle from 'react-use/lib/useToggle';
import { useSelector } from '@xstate5/react';
import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import { isWhereBlock } from '@kbn/streamlang';
import { css } from '@emotion/react';
import { useDiscardConfirm } from '../../../../../hooks/use_discard_confirm';
import {
  useStreamEnrichmentSelector,
  type StreamEnrichmentContextType,
} from '../../state_management/stream_enrichment_state_machine';
import { deleteProcessorPromptOptions } from './action/prompt_options';
import { deleteConditionPromptOptions } from './where/prompt_options';
import { collectDescendantIds } from '../../state_management/stream_enrichment_state_machine/utils';

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

interface StepContextMenuProps {
  stepRef: StreamEnrichmentContextType['stepRefs'][number];
  stepUnderEdit?: StreamlangStepWithUIAttributes;
}

export const StepContextMenu: React.FC<StepContextMenuProps> = ({ stepRef, stepUnderEdit }) => {
  const canEdit = useStreamEnrichmentSelector((snapshot) => snapshot.can({ type: 'step.edit' }));
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
    <EuiButtonEmpty
      aria-label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.stepContextMenuButtonAriaLabel',
        {
          defaultMessage: 'Step context menu',
        }
      )}
      disabled={!!stepUnderEdit}
      size="s"
      iconType="boxesVertical"
      onClick={togglePopover}
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
      button={button}
      isOpen={isPopoverOpen}
      closePopover={() => togglePopover(false)}
      panelPaddingSize="none"
    >
      <EuiContextMenuPanel size="s" items={items} />
    </EuiPopover>
  );
};
