/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ConversationOriginType } from '@kbn/agent-builder-common';
import type { ConversationRoundAuthor, ConversationRoundOrigin } from '@kbn/agent-builder-common';

const surfaces: Record<ConversationOriginType, { icon: IconType; label: string }> = {
  [ConversationOriginType.Slack]: {
    icon: 'logoSlack',
    label: i18n.translate('xpack.agentBuilder.round.origin.slack', {
      defaultMessage: 'Slack',
    }),
  },
};

const authorName = (author: ConversationRoundAuthor | undefined): string | undefined =>
  author?.full_name ?? author?.username;

interface RoundInputAttributionProps {
  origin?: ConversationRoundOrigin;
  author?: ConversationRoundAuthor;
}

/**
 * Names who asked and from where, for a round that did not originate in Kibana.
 *
 * Renders nothing for a Kibana-UI round: the asker is the person reading the transcript,
 * so attribution there is noise on every bubble.
 */
export const RoundInputAttribution = ({ origin, author }: RoundInputAttributionProps) => {
  const surface = origin ? surfaces[origin.type] : undefined;

  if (!surface) {
    return null;
  }

  const name = authorName(author);

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type={surface.icon} size="s" title={surface.label} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {name
            ? i18n.translate('xpack.agentBuilder.round.origin.authorVia', {
                defaultMessage: '{name} via {surface}',
                values: { name, surface: surface.label },
              })
            : i18n.translate('xpack.agentBuilder.round.origin.via', {
                defaultMessage: 'via {surface}',
                values: { surface: surface.label },
              })}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
