/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  AttachmentUIDefinition,
  ConversationDetailsRenderProps,
} from '@kbn/agent-builder-browser';

/** Data shape of one blind spot inside the blind_spots attachment. */
interface InvestigationBlindSpot {
  title: string;
  confidence: number;
  description: string;
}

/** Data shape of the investigations.blind_spots attachment. */
interface BlindSpotsAttachmentData {
  blind_spots: InvestigationBlindSpot[];
}

interface BlindSpotsAttachment {
  id: string;
  type: string;
  data: BlindSpotsAttachmentData;
}

const renderInlineContent = ({ attachment }: { attachment: BlindSpotsAttachment }) => {
  const blindSpots: InvestigationBlindSpot[] = attachment.data?.blind_spots ?? [];

  return (
    <EuiText size="s">
      {i18n.translate('xpack.agenticInvestigations.attachments.blindSpots.summary', {
        defaultMessage: '{count} {count, plural, one {blind spot} other {blind spots}}',
        values: { count: blindSpots.length },
      })}
    </EuiText>
  );
};

const BlindSpotItem = ({ blindSpot }: { blindSpot: InvestigationBlindSpot }) => {
  const confidencePct = Math.round(blindSpot.confidence * 100);

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow>
            <EuiText size="s">
              <strong>{blindSpot.title}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.agenticInvestigations.attachments.blindSpots.confidence', {
                defaultMessage: '{pct}% confidence',
                values: { pct: confidencePct },
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <p>{blindSpot.description}</p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const renderConversationDetailsContent = ({
  attachment,
}: ConversationDetailsRenderProps<BlindSpotsAttachment>) => {
  const blindSpots: InvestigationBlindSpot[] = attachment.data?.blind_spots ?? [];

  if (!blindSpots.length) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.agenticInvestigations.attachments.blindSpots.noBlindSpots', {
          defaultMessage: 'No blind spots recorded.',
        })}
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.agenticInvestigations.attachments.blindSpots.detailsTitle', {
              defaultMessage: 'Blind Spots',
            })}
          </h3>
        </EuiTitle>
      </EuiFlexItem>
      {blindSpots.map((blindSpot, idx) => (
        <React.Fragment key={idx}>
          <EuiFlexItem grow={false}>
            <BlindSpotItem blindSpot={blindSpot} />
          </EuiFlexItem>
          {idx < blindSpots.length - 1 && (
            <EuiFlexItem grow={false}>
              <EuiSpacer size="s" />
            </EuiFlexItem>
          )}
        </React.Fragment>
      ))}
    </EuiFlexGroup>
  );
};

export const blindSpotsAttachmentUIDefinition: AttachmentUIDefinition<BlindSpotsAttachment> = {
  getLabel: () =>
    i18n.translate('xpack.agenticInvestigations.attachments.blindSpots.label', {
      defaultMessage: 'Blind Spots',
    }),
  getIcon: () => 'eyeClosed',
  renderInlineContent,
  renderConversationDetailsContent,
};
