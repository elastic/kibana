/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  AttachmentUIDefinition,
  ConversationDetailsRenderProps,
} from '@kbn/agent-builder-browser';

const MAX_VISIBLE_CHIPS = 3;

/** Entity as stored inside the impact attachment data. */
interface ImpactEntity {
  name: string;
  type?: string;
  featureId?: string;
  streamName?: string;
}

/** Data shape of the investigations.impact attachment. */
interface ImpactAttachmentData {
  entities: ImpactEntity[];
}

interface ImpactAttachment {
  id: string;
  type: string;
  data: ImpactAttachmentData;
}

const EntityChips = ({ entities }: { entities: ImpactEntity[] }) => {
  const { euiTheme } = useEuiTheme();

  if (!entities.length) {
    return (
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.agenticInvestigations.attachments.impact.noEntities', {
          defaultMessage: 'No impacted entities',
        })}
      </EuiText>
    );
  }

  const visible = entities.slice(0, MAX_VISIBLE_CHIPS);
  const overflow = entities.length - visible.length;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap>
      {visible.map((entity) => {
        const chip = (
          <EuiBadge
            color="hollow"
            css={css`
              .euiBadge__text {
                display: inline-flex;
                align-items: center;
                gap: ${euiTheme.size.xs};
              }
            `}
          >
            {entity.name}
          </EuiBadge>
        );

        return (
          <EuiFlexItem key={entity.name} grow={false}>
            {entity.type ? <EuiToolTip content={entity.type}>{chip}</EuiToolTip> : chip}
          </EuiFlexItem>
        );
      })}
      {overflow > 0 && (
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" size="xs">
            {i18n.translate('xpack.agenticInvestigations.attachments.impact.overflowCount', {
              defaultMessage: '+{count} more',
              values: { count: overflow },
            })}
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const columns: Array<EuiBasicTableColumn<ImpactEntity>> = [
  {
    field: 'name',
    name: i18n.translate('xpack.agenticInvestigations.attachments.impact.columns.name', {
      defaultMessage: 'Name',
    }),
    truncateText: true,
  },
  {
    field: 'type',
    name: i18n.translate('xpack.agenticInvestigations.attachments.impact.columns.type', {
      defaultMessage: 'Type',
    }),
    truncateText: true,
    render: (type?: string) => type ?? '—',
  },
  {
    field: 'featureId',
    name: i18n.translate('xpack.agenticInvestigations.attachments.impact.columns.featureId', {
      defaultMessage: 'Feature ID',
    }),
    truncateText: true,
    render: (featureId?: string) => featureId ?? '—',
  },
  {
    field: 'streamName',
    name: i18n.translate('xpack.agenticInvestigations.attachments.impact.columns.streamName', {
      defaultMessage: 'Stream',
    }),
    truncateText: true,
    render: (streamName?: string) => streamName ?? '—',
  },
];

const renderInlineContent = ({ attachment }: { attachment: ImpactAttachment }) => {
  const entities: ImpactEntity[] = attachment.data?.entities ?? [];
  return <EntityChips entities={entities} />;
};

const renderConversationDetailsContent = ({
  attachment,
}: ConversationDetailsRenderProps<ImpactAttachment>) => {
  const entities: ImpactEntity[] = attachment.data?.entities ?? [];
  return (
    <EuiBasicTable
      tableCaption={i18n.translate('xpack.agenticInvestigations.attachments.impact.tableCaption', {
        defaultMessage: 'Impacted entities',
      })}
      items={entities}
      columns={columns}
      noItemsMessage={i18n.translate('xpack.agenticInvestigations.attachments.impact.noEntities', {
        defaultMessage: 'No impacted entities',
      })}
    />
  );
};

export const impactAttachmentUIDefinition: AttachmentUIDefinition<ImpactAttachment> = {
  getLabel: () =>
    i18n.translate('xpack.agenticInvestigations.attachments.impact.label', {
      defaultMessage: 'Impacted Entities',
    }),
  getIcon: () => 'inspect',
  canvasWidth: 'wide',
  renderInlineContent,
  renderConversationDetailsContent,
};
