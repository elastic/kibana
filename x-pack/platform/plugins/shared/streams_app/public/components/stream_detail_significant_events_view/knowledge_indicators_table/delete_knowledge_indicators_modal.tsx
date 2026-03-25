/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiBadge,
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
import type { KnowledgeIndicator } from '@kbn/streams-ai';
import { upperFirst } from 'lodash';
import React, { useMemo } from 'react';

interface DeleteKnowledgeIndicatorsModalProps {
  knowledgeIndicators: KnowledgeIndicator[];
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface DeleteKnowledgeIndicatorItem {
  id: string;
  title: string;
  type: string;
}

export function DeleteKnowledgeIndicatorsModal({
  knowledgeIndicators,
  onConfirm,
  onCancel,
  isLoading = false,
}: DeleteKnowledgeIndicatorsModalProps) {
  const items = useMemo<DeleteKnowledgeIndicatorItem[]>(
    () =>
      knowledgeIndicators.map((knowledgeIndicator) => {
        if (knowledgeIndicator.kind === 'feature') {
          return {
            id: `feature-${knowledgeIndicator.feature.uuid}`,
            title: knowledgeIndicator.feature.title ?? knowledgeIndicator.feature.id,
            type: knowledgeIndicator.feature.type,
          };
        }

        return {
          id: `query-${knowledgeIndicator.query.id}`,
          title: knowledgeIndicator.query.title ?? knowledgeIndicator.query.id,
          type: KNOWLEDGE_INDICATOR_QUERY_TYPE_LABEL,
        };
      }),
    [knowledgeIndicators]
  );

  const columns = useMemo(
    () => [
      {
        field: 'title',
        name: KNOWLEDGE_INDICATOR_COLUMN_LABEL,
      },
      {
        field: 'type',
        name: TYPE_COLUMN_LABEL,
        render: (type: string) => (
          <EuiBadge color="hollow" css={TYPE_BADGE_CSS}>
            {upperFirst(type)}
          </EuiBadge>
        ),
      },
    ],
    []
  );

  return (
    <EuiModal onClose={onCancel} aria-label={MODAL_ARIA_LABEL} maxWidth={600}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('xpack.streams.deleteKnowledgeIndicatorsModal.title', {
            defaultMessage:
              'Are you sure you want to delete {count, plural, one {this knowledge indicator} other {these knowledge indicators}}?',
            values: { count: knowledgeIndicators.length },
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText>
          {i18n.translate('xpack.streams.deleteKnowledgeIndicatorsModal.consequenceMessage', {
            defaultMessage:
              'This will permanently delete {count, plural, one {the knowledge indicator} other {the selected knowledge indicators}}.',
            values: { count: knowledgeIndicators.length },
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
          {i18n.translate('xpack.streams.deleteKnowledgeIndicatorsModal.deleteButton', {
            defaultMessage:
              'Delete {count, plural, one {knowledge indicator} other {knowledge indicators}}',
            values: { count: knowledgeIndicators.length },
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}

const KNOWLEDGE_INDICATOR_COLUMN_LABEL = i18n.translate(
  'xpack.streams.deleteKnowledgeIndicatorsModal.knowledgeIndicatorColumn',
  {
    defaultMessage: 'Knowledge indicator',
  }
);

const TYPE_COLUMN_LABEL = i18n.translate(
  'xpack.streams.deleteKnowledgeIndicatorsModal.typeColumn',
  {
    defaultMessage: 'Type',
  }
);

const MODAL_ARIA_LABEL = i18n.translate(
  'xpack.streams.deleteKnowledgeIndicatorsModal.euiModal.deleteKnowledgeIndicatorsModalLabel',
  { defaultMessage: 'Delete knowledge indicators modal' }
);

const WARNING_MESSAGE = i18n.translate(
  'xpack.streams.deleteKnowledgeIndicatorsModal.warningMessage',
  {
    defaultMessage: 'This action cannot be undone.',
  }
);

const TABLE_CAPTION = i18n.translate('xpack.streams.deleteKnowledgeIndicatorsModal.tableCaption', {
  defaultMessage: 'List of knowledge indicators to delete',
});

const CANCEL_BUTTON_LABEL = i18n.translate(
  'xpack.streams.deleteKnowledgeIndicatorsModal.cancelButton',
  {
    defaultMessage: 'Cancel',
  }
);

const KNOWLEDGE_INDICATOR_QUERY_TYPE_LABEL = i18n.translate(
  'xpack.streams.deleteKnowledgeIndicatorsModal.queryTypeLabel',
  {
    defaultMessage: 'Query',
  }
);

const MODAL_TABLE_CSS = css`
  max-height: 300px;
  overflow: auto;
`;

const TYPE_BADGE_CSS = css`
  text-transform: capitalize;
`;
