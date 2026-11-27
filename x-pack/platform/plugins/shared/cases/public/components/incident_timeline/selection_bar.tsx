/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { SECURITY_ALERT_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import type { IncidentTimelineAlert } from '../../../common/types/api';
import { useCasesContext } from '../cases_context/use_cases_context';
import { MarkdownRenderer } from '../markdown_editor';
import { renderAttachmentAction } from '../user_actions/attachment_action';
import { formatRange, formatTime, useTimeFormat } from './format';
import type { TimelineSelection } from './model';
import * as i18n from './translations';

interface SelectionBarProps {
  selection: TimelineSelection;
  /** The case's loaded alerts by id; undefined while they load. */
  alertsById?: ReadonlyMap<string, IncidentTimelineAlert>;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onMarkAsSignificant: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClear: () => void;
}

/** The alert flyout comes from the alert attachment type, so Cases does not import it. */
export const ViewAlertAction: React.FC<{ alertId: string; index: string }> = ({
  alertId,
  index,
}) => {
  const { unifiedAttachmentTypeRegistry } = useCasesContext();
  if (!unifiedAttachmentTypeRegistry.has(SECURITY_ALERT_ATTACHMENT_TYPE)) return null;
  const action = unifiedAttachmentTypeRegistry
    .get(SECURITY_ALERT_ATTACHMENT_TYPE)
    .getDocumentAction?.({ id: alertId, documentId: alertId, index });
  return action ? renderAttachmentAction(action, 'incident-timeline-view-alert') : null;
};

export const SelectionBar: React.FC<SelectionBarProps> = ({
  selection,
  alertsById,
  canCreate,
  canUpdate,
  canDelete,
  onMarkAsSignificant,
  onEdit,
  onDelete,
  onClear,
}) => {
  const timeFormat = useTimeFormat();

  if (selection.kind === 'alert') {
    const { alert, ruleName } = selection;
    return (
      <EuiPanel hasBorder paddingSize="s" data-test-subj="incident-timeline-selection-bar">
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>{i18n.SELECTION}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">{`${ruleName} · ${formatTime(
              Date.parse(alert.time),
              timeFormat
            )}`}</EuiText>
          </EuiFlexItem>
          <ViewAlertAction alertId={alert.id} index={alert.index} />
          {canCreate && (
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                iconType="flag"
                onClick={onMarkAsSignificant}
                data-test-subj="incident-timeline-mark-significant"
              >
                {i18n.MARK_AS_SIGNIFICANT}
              </EuiButton>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiToolTip content={i18n.CLEAR_SELECTION} disableScreenReaderOutput>
              <EuiButtonIcon iconType="cross" aria-label={i18n.CLEAR_SELECTION} onClick={onClear} />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  const { entry } = selection;
  const { data } = entry;
  const linkedAlert = data.alert ? alertsById?.get(data.alert.id) : undefined;
  const linkedAlertMissing = data.alert !== undefined && alertsById !== undefined && !linkedAlert;
  return (
    <EuiPanel hasBorder paddingSize="s" data-test-subj="incident-timeline-entry-details">
      <EuiFlexGroup alignItems="flexStart" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{i18n.CATEGORY_LABELS[entry.category]}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{data.title}</strong>
            <div>
              {entry.endMs !== undefined
                ? formatRange(entry.occurredMs, entry.endMs, timeFormat)
                : formatTime(entry.occurredMs, timeFormat)}
              {' · '}
              {i18n.BY_USER(entry.createdBy)}
            </div>
            {data.content && <MarkdownRenderer textSize="s">{data.content}</MarkdownRenderer>}
            {linkedAlert && <div>{i18n.LINKED_ALERT(linkedAlert.ruleName ?? linkedAlert.id)}</div>}
            {linkedAlertMissing && <div>{i18n.LINKED_ALERT_NOT_ATTACHED}</div>}
          </EuiText>
        </EuiFlexItem>
        {linkedAlert && <ViewAlertAction alertId={linkedAlert.id} index={linkedAlert.index} />}
        {canUpdate && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="pencil"
              onClick={onEdit}
              data-test-subj="incident-timeline-entry-edit"
            >
              {i18n.EDIT}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
        {canDelete && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="trash"
              color="danger"
              onClick={onDelete}
              data-test-subj="incident-timeline-entry-delete"
            >
              {i18n.DELETE}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiToolTip content={i18n.CLEAR_SELECTION} disableScreenReaderOutput>
            <EuiButtonIcon iconType="cross" aria-label={i18n.CLEAR_SELECTION} onClick={onClear} />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

ViewAlertAction.displayName = 'ViewAlertAction';
SelectionBar.displayName = 'SelectionBar';
