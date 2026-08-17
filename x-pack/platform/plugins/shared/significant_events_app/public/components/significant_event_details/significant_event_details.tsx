/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { SignificantEvent, SignificantEventResponse } from '@kbn/significant-events-schema';
import { InfoPanel } from '../info_panel';
import { formatTimestamp } from '../../util/formatters';

const DESCRIPTION_TITLE = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.flyout.descriptionTitle',
  {
    defaultMessage: 'Description',
  }
);
const GENERAL_INFORMATION_TITLE = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.flyout.generalInformationTitle',
  {
    defaultMessage: 'General information',
  }
);
const CREATED_AT_LABEL = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.flyout.createdAtLabel',
  {
    defaultMessage: 'Created at',
  }
);
const CAUSAL_FEATURES_LABEL = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.flyout.causalFeatures',
  {
    defaultMessage: 'Causal features',
  }
);
const STREAMS_LABEL = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.flyout.streams',
  {
    defaultMessage: 'Streams',
  }
);
const EMPTY_VALUE = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.flyout.emptyValue',
  {
    defaultMessage: '—',
  }
);

const signalPanelCss = css`
  margin-bottom: 4px;
`;

const BadgeRow = ({ items, color }: { items: string[]; color?: string }) => {
  if (items.length === 0) {
    return (
      <EuiText size="s" color="subdued">
        {EMPTY_VALUE}
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
      {items.map((item, idx) => (
        <EuiFlexItem grow={false} key={`${item}-${idx}`}>
          <EuiBadge color={color ?? 'default'}>{item}</EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

interface SignificantEventDetailsProps {
  event: SignificantEvent | SignificantEventResponse;
}

export const SignificantEventDetails = ({ event }: SignificantEventDetailsProps) => {
  const signals = event.signals ?? [];
  const detectionSignals = signals.filter((s) => s.type === 'detection');
  const createdAt = 'created_at' in event ? event.created_at : event['@timestamp'];

  const generalInfoItems = useMemo(
    () => [
      {
        title: CREATED_AT_LABEL,
        description: <EuiText size="s">{formatTimestamp(createdAt)}</EuiText>,
      },
      {
        title: STREAMS_LABEL,
        description: <BadgeRow items={event.stream_names ?? []} color="hollow" />,
      },
      {
        title: CAUSAL_FEATURES_LABEL,
        description: (
          <BadgeRow
            items={(event.causal_features ?? []).map(
              (f) => `${f.name || '-'}${f.stream_name ? ` (${f.stream_name})` : ''}`
            )}
          />
        ),
      },
    ],
    [createdAt, event.stream_names, event.causal_features]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {event.summary && (
        <InfoPanel title={DESCRIPTION_TITLE}>
          <EuiText size="s">
            <p>{event.summary}</p>
          </EuiText>
        </InfoPanel>
      )}

      <InfoPanel title={GENERAL_INFORMATION_TITLE}>
        {generalInfoItems.map((listItem, index) => (
          <React.Fragment key={listItem.title}>
            <EuiDescriptionList
              type="column"
              columnWidths={[1, 2]}
              compressed
              listItems={[listItem]}
            />
            {index < generalInfoItems.length - 1 && <EuiHorizontalRule margin="m" />}
          </React.Fragment>
        ))}
      </InfoPanel>

      {detectionSignals.length > 0 && (
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.significantEventsApp.significantEventsTab.flyout.signals', {
                defaultMessage: 'Signals ({count})',
                values: { count: detectionSignals.length },
              })}
            </h3>
          </EuiTitle>
          {detectionSignals.map((signal, idx) => (
            <EuiPanel key={idx} color="plain" hasBorder paddingSize="s" css={signalPanelCss}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
                {signal.metadata?.rule_name && (
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <strong>{signal.metadata.rule_name}</strong>
                    </EuiText>
                  </EuiFlexItem>
                )}
                {signal.stream_name && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">{signal.stream_name}</EuiBadge>
                  </EuiFlexItem>
                )}
                {signal.evidence?.result && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={signal.evidence.result === 'empty' ? 'hollow' : 'warning'}>
                      {signal.evidence.result}
                    </EuiBadge>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
              {signal.description && (
                <EuiText size="xs" color="subdued">
                  {signal.description}
                </EuiText>
              )}
            </EuiPanel>
          ))}
        </EuiFlexGroup>
      )}
    </EuiFlexGroup>
  );
};
