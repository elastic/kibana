/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiConfirmModal,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { DiscoverBadgeButton } from '../../stream_badges';
import {
  CANCEL_BUTTON_LABEL,
  DELETE_DESTINATION_CONFIRM_BUTTON,
  DELETE_DESTINATION_CONFIRM_MESSAGE,
  DELETE_DESTINATION_CONFIRM_TITLE,
  DELETE_DESTINATION_LABEL,
  DESTINATION_ACTIONS_ARIA_LABEL,
  VIEW_ON_CANVAS_LABEL,
} from './translations';
import type { DestinationRow } from './types';

export function DestinationRowActions({
  destination,
  canvasHref,
  onDelete,
}: {
  destination: DestinationRow;
  canvasHref: string;
  onDelete: (name: string) => void;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const deleteModalTitleId = useGeneratedHtmlId({ prefix: 'deleteDestinationModalTitle' });

  const overflowAriaLabel = i18n.translate(
    'xpack.streams.destinationsTable.rowActionsOverflowAriaLabel',
    {
      defaultMessage: 'More actions for {name}',
      values: { name: destination.name },
    }
  );

  return (
    <>
      <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <DiscoverBadgeButton
            hasDataStream
            indexMode={destination.indexMode}
            stream={destination.streamDefinition}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={VIEW_ON_CANVAS_LABEL} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="waypoint"
              href={canvasHref}
              size="xs"
              aria-label={VIEW_ON_CANVAS_LABEL}
              data-test-subj={`streamsDestinationsViewOnCanvas-${destination.name}`}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            aria-label={overflowAriaLabel}
            isOpen={isMenuOpen}
            closePopover={() => setIsMenuOpen(false)}
            anchorPosition="downRight"
            panelPaddingSize="none"
            button={
              <EuiToolTip content={DESTINATION_ACTIONS_ARIA_LABEL} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="boxesVertical"
                  size="xs"
                  onClick={() => setIsMenuOpen((open) => !open)}
                  aria-label={overflowAriaLabel}
                  data-test-subj={`streamsDestinationsRowActions-${destination.name}`}
                />
              </EuiToolTip>
            }
          >
            <EuiContextMenuPanel
              items={[
                <EuiContextMenuItem
                  key="delete"
                  icon="trash"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsDeleteConfirmOpen(true);
                  }}
                  data-test-subj={`streamsDestinationsDelete-${destination.name}`}
                >
                  {DELETE_DESTINATION_LABEL}
                </EuiContextMenuItem>,
              ]}
            />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
      {isDeleteConfirmOpen && (
        <EuiConfirmModal
          aria-labelledby={deleteModalTitleId}
          titleProps={{ id: deleteModalTitleId }}
          title={DELETE_DESTINATION_CONFIRM_TITLE}
          onCancel={() => setIsDeleteConfirmOpen(false)}
          onConfirm={() => {
            setIsDeleteConfirmOpen(false);
            onDelete(destination.name);
          }}
          cancelButtonText={CANCEL_BUTTON_LABEL}
          confirmButtonText={DELETE_DESTINATION_CONFIRM_BUTTON}
          buttonColor="danger"
          defaultFocusedButton="confirm"
          data-test-subj={`streamsDestinationsDeleteConfirm-${destination.name}`}
        >
          <p>{DELETE_DESTINATION_CONFIRM_MESSAGE}</p>
        </EuiConfirmModal>
      )}
    </>
  );
}
