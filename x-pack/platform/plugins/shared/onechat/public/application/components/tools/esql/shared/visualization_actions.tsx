/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import type {
  InlineEditLensEmbeddableContext,
  TypedLensByValueInput,
} from '@kbn/lens-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { i18n } from '@kbn/i18n';
import { EditVisualizationButton, saveButtonLabel } from './edit_visualization_button';
import { actionsContainer } from './styles';

const promoteToAttachmentLabel = i18n.translate(
  'xpack.onechat.conversation.visualization.promoteToAttachment',
  {
    defaultMessage: 'Promote to attachment',
  }
);

const openAttachmentLabel = i18n.translate(
  'xpack.onechat.conversation.visualization.openAttachment',
  {
    defaultMessage: 'Open attachment',
  }
);

interface Props {
  onSave: () => void;
  uiActions: UiActionsStart;
  lensInput: TypedLensByValueInput | undefined;
  lensLoadEvent: InlineEditLensEmbeddableContext['lensEvent'] | null;
  setLensInput: (input: TypedLensByValueInput) => void;
  /** Optional callback to promote visualization to attachment */
  onPromoteToAttachment?: () => void;
  /** If the visualization is already an attachment, this is its ID */
  existingAttachmentId?: string;
  /** Callback to open an existing attachment in the viewer */
  onOpenAttachment?: (attachmentId: string) => void;
}

export function VisualizationActions({
  onSave,
  uiActions,
  lensInput,
  lensLoadEvent,
  setLensInput,
  onPromoteToAttachment,
  existingAttachmentId,
  onOpenAttachment,
}: Props) {
  const { euiTheme } = useEuiTheme();

  // Handle click on the attachment button
  const handleAttachmentClick = useCallback(() => {
    if (existingAttachmentId && onOpenAttachment) {
      // Already an attachment - open it in the viewer
      onOpenAttachment(existingAttachmentId);
    } else if (onPromoteToAttachment) {
      // Not yet an attachment - promote it
      onPromoteToAttachment();
    }
  }, [existingAttachmentId, onOpenAttachment, onPromoteToAttachment]);

  if (!lensInput) {
    return null;
  }

  const containerCss = css(actionsContainer(euiTheme));
  const iconCss = css({ marginLeft: '-1px' });

  // Determine button properties based on whether it's already an attachment
  const isAlreadyAttachment = Boolean(existingAttachmentId);
  const attachmentButtonLabel = isAlreadyAttachment ? openAttachmentLabel : promoteToAttachmentLabel;
  const attachmentButtonIcon = isAlreadyAttachment ? 'eye' : 'pinFilled';

  // Show the attachment button if we can promote or if it's already an attachment
  const showAttachmentButton = onPromoteToAttachment || (existingAttachmentId && onOpenAttachment);

  return (
    <div
      className={`visualization-button-actions ${containerCss}`}
      data-test-subj="visualizationButtonActions"
    >
      <EditVisualizationButton
        uiActions={uiActions}
        lensInput={lensInput}
        lensLoadEvent={lensLoadEvent}
        onAttributesChange={(attrs) => setLensInput({ ...lensInput, attributes: attrs })}
        onApply={onSave}
      />
      <EuiToolTip content={saveButtonLabel} disableScreenReaderOutput>
        <EuiButtonIcon
          display="base"
          color="text"
          size="s"
          iconType="save"
          aria-label={saveButtonLabel}
          className={iconCss}
          onClick={onSave}
        />
      </EuiToolTip>
      {showAttachmentButton && (
        <EuiToolTip content={attachmentButtonLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            display="base"
            color="text"
            size="s"
            iconType={attachmentButtonIcon}
            aria-label={attachmentButtonLabel}
            className={iconCss}
            onClick={handleAttachmentClick}
            data-test-subj={isAlreadyAttachment ? 'openAttachmentButton' : 'promoteToAttachmentButton'}
          />
        </EuiToolTip>
      )}
    </div>
  );
}
