/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import type { SignificantEventQueryRow } from '../../../hooks/use_fetch_discovery_queries';
import { SeverityBadge } from '../../significant_events_discovery/components/severity_badge/severity_badge';

interface DeleteRulesModalProps {
  rules: SignificantEventQueryRow[];
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface DeleteRuleItem {
  id: string;
  title: string;
  severity: number;
}

export function DeleteRulesModal({
  rules,
  onConfirm,
  onCancel,
  isLoading = false,
}: DeleteRulesModalProps) {
  const items = useMemo<DeleteRuleItem[]>(
    () =>
      rules.map((rule) => ({
        id: rule.query.id,
        title: rule.query.title ?? rule.query.id,
        severity: rule.query.severity_score,
      })),
    [rules]
  );

  const columns = useMemo(
    () => [
      {
        field: 'title',
        name: RULE_COLUMN_LABEL,
      },
      {
        field: 'severity',
        name: SEVERITY_COLUMN_LABEL,
        render: (severity: number) => <SeverityBadge score={severity} />,
      },
    ],
    []
  );

  return (
    <EuiModal onClose={onCancel} aria-label={MODAL_ARIA_LABEL} maxWidth={600}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('xpack.streams.deleteRulesModal.title', {
            defaultMessage:
              'Are you sure you want to delete {count, plural, one {this rule} other {these rules}}?',
            values: { count: rules.length },
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText>
          {i18n.translate('xpack.streams.deleteRulesModal.consequenceMessage', {
            defaultMessage:
              'This will permanently delete {count, plural, one {the selected rule} other {the selected rules}}.',
            values: { count: rules.length },
          })}
        </EuiText>
        <EuiSpacer size="m" />
        <EuiCallOut announceOnMount color="warning" iconType="warning" title={WARNING_MESSAGE} />
        <EuiSpacer size="m" />
        <EuiBasicTable
          css={MODAL_TABLE_CSS}
          tableCaption={TABLE_CAPTION}
          items={items}
          itemId="id"
          columns={columns}
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel} disabled={isLoading}>
          {CANCEL_BUTTON_LABEL}
        </EuiButtonEmpty>
        <EuiButton color="danger" onClick={onConfirm} isLoading={isLoading} fill>
          {i18n.translate('xpack.streams.deleteRulesModal.deleteButton', {
            defaultMessage: 'Delete {count, plural, one {rule} other {rules}}',
            values: { count: rules.length },
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}

const RULE_COLUMN_LABEL = i18n.translate('xpack.streams.deleteRulesModal.ruleColumn', {
  defaultMessage: 'Rule',
});

const SEVERITY_COLUMN_LABEL = i18n.translate('xpack.streams.deleteRulesModal.severityColumn', {
  defaultMessage: 'Severity',
});

const MODAL_ARIA_LABEL = i18n.translate(
  'xpack.streams.deleteRulesModal.euiModal.deleteRulesModalLabel',
  {
    defaultMessage: 'Delete rules modal',
  }
);

const WARNING_MESSAGE = i18n.translate('xpack.streams.deleteRulesModal.warningMessage', {
  defaultMessage: 'This action cannot be undone.',
});

const TABLE_CAPTION = i18n.translate('xpack.streams.deleteRulesModal.tableCaption', {
  defaultMessage: 'List of rules to delete',
});

const CANCEL_BUTTON_LABEL = i18n.translate('xpack.streams.deleteRulesModal.cancelButton', {
  defaultMessage: 'Cancel',
});

const MODAL_TABLE_CSS = css`
  max-height: 300px;
  overflow: auto;
`;
