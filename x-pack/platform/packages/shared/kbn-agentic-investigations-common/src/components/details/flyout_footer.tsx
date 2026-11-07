/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import { icon as checkIcon } from '@elastic/eui/es/components/icon/assets/check';
import { icon as chevronSingleDownIcon } from '@elastic/eui/es/components/icon/assets/chevron_single_down';
import { icon as refreshIcon } from '@elastic/eui/es/components/icon/assets/refresh';
import { icon as trashIcon } from '@elastic/eui/es/components/icon/assets/trash';
import { AiButtonEmpty } from '@kbn/ui-ai-components';
import type { Investigation } from '../../types';
import { type CardActionType } from '../actions';
import {
  InvestigationActionModals,
  type CloseInvestigationModalRenderProps,
  type EscalationModalRenderProps,
} from '../modals/investigation_action_modals';
import { DETAILS_FLYOUT_LABELS } from './translations';
import { ACTIONS_TRANSLATIONS } from '../actions/translations';

/** Instant icon: string `type` names load async and leave the Actions menu blank first. */
const menuIcon = (type: typeof trashIcon) => (
  <EuiIcon type={type} size="m" className="euiContextMenu__icon" color="inherit" aria-hidden />
);

export type { CloseInvestigationModalRenderProps };

export interface DeleteInvestigationModalRenderProps {
  investigation: Investigation;
  onClose: () => void;
}

export interface ConversationDetailsFlyoutFooterProps {
  isOpenedFromChat: boolean;
  investigation: Investigation;
  /** Supplied by the caller because flyout slots render outside a `KibanaContextProvider`. */
  onOpenChat: () => void;
  /**
   * When provided, the "Open an escalation" item in the actions menu opens the escalation modal.
   * Supplied by the caller who has access to Kibana HTTP hooks unavailable in this package.
   */
  onOpenEscalation?: (props: EscalationModalRenderProps) => React.ReactNode;
  /**
   * Wraps the "Open escalation" button, so the caller can hide it once it learns at render time
   * that the user may not escalate. Without it the button shows whenever `onOpenEscalation` is
   * supplied.
   */
  wrapEscalationButton?: (button: React.ReactElement) => React.ReactNode;
  /**
   * When provided, the "Close" Actions item renders a confirmation modal.
   * Supplied by the caller so the modal can use HTTP hooks unavailable in this package.
   * Ignored when {@link onCloseInvestigationImmediate} is set.
   */
  onCloseInvestigation?: (props: CloseInvestigationModalRenderProps) => React.ReactNode;
  /**
   * When provided, Close runs this immediately with no confirmation (same as Open).
   * Takes precedence over {@link onCloseInvestigation}.
   */
  onCloseInvestigationImmediate?: (investigation: Investigation) => void | Promise<void>;
  /**
   * When provided, the Actions menu offers "Open" on a closed investigation (no confirmation).
   * Supplied by the caller so the mutation can use HTTP hooks unavailable in this package.
   */
  onReopenInvestigation?: (investigation: Investigation) => void | Promise<void>;
  /**
   * When provided, the Actions menu offers "Delete investigation" with a confirmation modal.
   * Supplied by the caller so the modal can use HTTP hooks unavailable in this package.
   */
  onDeleteInvestigation?: (props: DeleteInvestigationModalRenderProps) => React.ReactNode;
  /**
   * Wraps the Actions menu, so the caller can hide it when the user may not manage investigations.
   */
  wrapActionsMenu?: (menu: React.ReactElement) => React.ReactNode;
}

const isInvestigationClosed = (investigation: Investigation): boolean =>
  investigation.conversationStatus === 'closed' || investigation.status === 'closed';

/**
 * Footer slot content. It owns its action modals rather than delegating them upwards: the flyout
 * can be mounted through `core.overlays.openFlyout`, where there is no page-level React tree.
 */
export const ConversationDetailsFlyoutFooter = ({
  isOpenedFromChat,
  investigation,
  onOpenChat,
  onOpenEscalation,
  wrapEscalationButton,
  onCloseInvestigation,
  onCloseInvestigationImmediate,
  onReopenInvestigation,
  onDeleteInvestigation,
  wrapActionsMenu,
}: ConversationDetailsFlyoutFooterProps) => {
  const { euiTheme } = useEuiTheme();
  const [modalAction, setModalAction] = useState<CardActionType | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const closeModal = useCallback(() => setModalAction(null), []);
  const closeActions = useCallback(() => setIsActionsOpen(false), []);
  const canRenderEscalationButton = Boolean(onOpenEscalation);
  const closed = isInvestigationClosed(investigation);
  const canCloseOrOpen =
    Boolean(onCloseInvestigationImmediate) ||
    Boolean(onCloseInvestigation) ||
    Boolean(onReopenInvestigation);
  const canDelete = Boolean(onDeleteInvestigation);
  const showActionsMenu = canDelete || canCloseOrOpen;

  const escalationButton = (
    <EuiFlexItem grow={false}>
      <EuiButton
        color="primary"
        iconType="document"
        onClick={() => setModalAction('createEscalation')}
        size="s"
      >
        {ACTIONS_TRANSLATIONS.buttons.openEscalation}
      </EuiButton>
    </EuiFlexItem>
  );

  const renderCloseModal =
    !onCloseInvestigationImmediate && onCloseInvestigation
      ? (props: CloseInvestigationModalRenderProps) => onCloseInvestigation(props)
      : undefined;

  const actionItems = useMemo(() => {
    const itemCss = {
      padding: `${euiTheme.size.xs} ${euiTheme.size.m}`,
      borderRadius: 0,
      '&:first-of-type': {
        borderRadius: `${euiTheme.size.m} ${euiTheme.size.m} 0 0`,
      },
      '&:last-of-type': {
        borderRadius: `0 0 ${euiTheme.size.m} ${euiTheme.size.m}`,
      },
    };

    const items: React.ReactElement[] = [];

    // Delete first, with a divider under it before Close/Open.
    if (canDelete) {
      items.push(
        <EuiContextMenuItem
          key="delete"
          css={itemCss}
          icon={menuIcon(trashIcon)}
          color="danger"
          onClick={() => {
            closeActions();
            setIsDeleteOpen(true);
          }}
          data-test-subj="investigationFlyoutActionsDelete"
        >
          {ACTIONS_TRANSLATIONS.buttons.deleteInvestigation}
        </EuiContextMenuItem>
      );
    }

    if (canCloseOrOpen) {
      if (canDelete) {
        items.push(<EuiHorizontalRule key="deleteSeparator" margin="none" />);
      }
      if (closed && onReopenInvestigation) {
        items.push(
          <EuiContextMenuItem
            key="open"
            css={itemCss}
            icon={menuIcon(refreshIcon)}
            onClick={() => {
              closeActions();
              void onReopenInvestigation(investigation);
            }}
            data-test-subj="investigationFlyoutActionsOpen"
          >
            {ACTIONS_TRANSLATIONS.buttons.openShort}
          </EuiContextMenuItem>
        );
      } else if (!closed && (onCloseInvestigationImmediate || onCloseInvestigation)) {
        items.push(
          <EuiContextMenuItem
            key="close"
            css={itemCss}
            icon={menuIcon(checkIcon)}
            onClick={() => {
              closeActions();
              if (onCloseInvestigationImmediate) {
                void onCloseInvestigationImmediate(investigation);
                return;
              }
              setModalAction('close');
            }}
            data-test-subj="investigationFlyoutActionsClose"
          >
            {ACTIONS_TRANSLATIONS.buttons.closeShort}
          </EuiContextMenuItem>
        );
      }
    }

    return items;
  }, [
    canCloseOrOpen,
    canDelete,
    closeActions,
    closed,
    euiTheme.size.m,
    euiTheme.size.xs,
    investigation,
    onCloseInvestigation,
    onCloseInvestigationImmediate,
    onReopenInvestigation,
  ]);

  const actionsMenu = showActionsMenu ? (
    <EuiFlexItem grow={false}>
      <EuiPopover
        anchorPosition="upRight"
        panelPaddingSize="none"
        button={
          <EuiButton
            size="s"
            color="primary"
            fill
            iconType={chevronSingleDownIcon}
            iconSide="right"
            onClick={() => setIsActionsOpen((open) => !open)}
            data-test-subj="investigationFlyoutActionsButton"
          >
            {ACTIONS_TRANSLATIONS.buttons.actions}
          </EuiButton>
        }
        isOpen={isActionsOpen}
        closePopover={closeActions}
        aria-label={ACTIONS_TRANSLATIONS.popover.ariaLabel}
      >
        <EuiContextMenuPanel
          css={`
            padding: 0;
          `}
          items={actionItems}
          data-test-subj="investigationFlyoutActionsPanel"
        />
      </EuiPopover>
    </EuiFlexItem>
  ) : null;

  return (
    <>
      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" justifyContent="flexEnd">
        {!isOpenedFromChat && (
          <EuiFlexItem grow={false}>
            <AiButtonEmpty
              size="s"
              iconType="productAgent"
              onClick={onOpenChat}
              data-test-subj="investigationFlyoutOpenChat"
            >
              {DETAILS_FLYOUT_LABELS.actions.openChat}
            </AiButtonEmpty>
          </EuiFlexItem>
        )}
        {canRenderEscalationButton &&
          (wrapEscalationButton ? wrapEscalationButton(escalationButton) : escalationButton)}
        {actionsMenu && (wrapActionsMenu ? wrapActionsMenu(actionsMenu) : actionsMenu)}
      </EuiFlexGroup>

      <InvestigationActionModals
        action={modalAction}
        investigation={investigation}
        onCloseAction={closeModal}
        onCloseApproval={closeModal}
        renderCloseModal={renderCloseModal}
        renderEscalationModal={onOpenEscalation}
      />

      {isDeleteOpen && onDeleteInvestigation
        ? onDeleteInvestigation({
            investigation,
            onClose: () => setIsDeleteOpen(false),
          })
        : null}
    </>
  );
};
