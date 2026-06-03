/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import {
  UserActionType,
  deserializeAuditValue,
  type UserActionEvent,
  type FieldChangedUserActionPayload,
} from '@kbn/agent-builder-common';
import { parseTemplateAssignees } from '../detail/template_assignees_utils';

const formatScalarValue = (value: unknown): string => {
  if (value === undefined || value === null || value === '') {
    return i18n.translate('xpack.agentBuilder.activityAudit.emptyValue', {
      defaultMessage: 'none',
    });
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
};

const formatFieldValue = (field: string, value: unknown): string => {
  const resolvedValue = deserializeAuditValue(value);

  if (field === 'assignees') {
    const assignees = parseTemplateAssignees(resolvedValue);
    if (assignees.length === 0) {
      return formatScalarValue(resolvedValue);
    }
    return assignees.map(({ username }) => username).join(', ');
  }

  return formatScalarValue(resolvedValue);
};

const formatFieldLabel = (field: string): string =>
  field
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const fieldChangedMessage = ({
  username,
  field,
  previous_value,
  new_value,
}: {
  username: string;
  field: string;
  previous_value: unknown;
  new_value: unknown;
}) => {
  const fieldLabel = formatFieldLabel(field);
  const fromValue = formatFieldValue(field, previous_value);
  const toValue = formatFieldValue(field, new_value);

  return i18n.translate('xpack.agentBuilder.activityAudit.fieldChanged', {
    defaultMessage: '{username} changed {field} from {fromValue} to {toValue}',
    values: { username, field: fieldLabel, fromValue, toValue },
  });
};

const describeUserAction = (event: UserActionEvent): string => {
  if (event.action === UserActionType.field_changed) {
    const payload = event.payload as FieldChangedUserActionPayload;
    return fieldChangedMessage({
      username: event.user.username,
      field: payload.field,
      previous_value: payload.previous_value,
      new_value: payload.new_value,
    });
  }

  return i18n.translate('xpack.agentBuilder.activityAudit.generic', {
    defaultMessage: '{username} updated the investigation',
    values: { username: event.user.username },
  });
};

interface ActivityAuditRowProps {
  event: UserActionEvent;
}

export const ActivityAuditRow: React.FC<ActivityAuditRowProps> = ({ event }) => {
  const { euiTheme } = useEuiTheme();
  const message = useMemo(() => describeUserAction(event), [event]);

  const panelStyles = css`
    background: ${euiTheme.colors.backgroundLightText};
    border-radius: ${euiTheme.size.s};
    max-inline-size: 90%;
    margin-inline: auto;
  `;

  return (
    <EuiFlexGroup justifyContent="center" responsive={false}>
      <EuiFlexItem grow={false} css={panelStyles}>
        <EuiPanel paddingSize="s" hasShadow={false} hasBorder={false}>
          <EuiText size="xs" color="subdued" textAlign="center">
            {message}
          </EuiText>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
