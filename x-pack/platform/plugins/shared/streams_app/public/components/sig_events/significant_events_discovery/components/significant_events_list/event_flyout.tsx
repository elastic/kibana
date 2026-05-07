/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiTitle,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
  EuiDescriptionList,
  EuiPanel,
  EuiListGroup,
  EuiListGroupItem,
  EuiButtonEmpty,
  EuiHorizontalRule,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { VERDICT_COLORS, IMPACT_COLORS } from '@kbn/streams-plugin/common';
import type { Verdict, Impact, SigEvent } from '@kbn/streams-plugin/common';
import { TRANSLATIONS } from './translations';

interface EventFlyoutProps {
  event: SigEvent;
  onClose: () => void;
}

export const EventFlyout = ({ event, onClose }: EventFlyoutProps) => {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'sigEventFlyout' });

  const metadataItems = [
    {
      title: TRANSLATIONS.flyout.criticality,
      description: String(event.criticality),
    },
    {
      title: TRANSLATIONS.flyout.impact,
      description: (
        <EuiBadge color={IMPACT_COLORS[event.impact as Impact] ?? 'hollow'}>
          {event.impact}
        </EuiBadge>
      ),
    },
    {
      title: TRANSLATIONS.flyout.action,
      description: event.recommended_action ?? '—',
    },
    {
      title: TRANSLATIONS.flyout.lastReviewed,
      description: event.last_reviewed_at ? new Date(event.last_reviewed_at).toLocaleString() : '—',
    },
  ];

  return (
    <EuiFlyout onClose={onClose} size="m" ownFocus aria-labelledby={flyoutTitleId}>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiBadge color={VERDICT_COLORS[event.verdict as Verdict] ?? 'default'}>
              {event.verdict}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2 id={flyoutTitleId}>{event.title}</h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiDescriptionList type="column" listItems={metadataItems} compressed />

        <EuiSpacer size="m" />

        <EuiTitle size="xs">
          <h3>{TRANSLATIONS.flyout.streams}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="xs" wrap>
          {(event.stream_names ?? []).map((name) => (
            <EuiFlexItem grow={false} key={name}>
              <EuiBadge color="hollow">{name}</EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>

        <EuiHorizontalRule />

        <EuiTitle size="xs">
          <h3>{TRANSLATIONS.flyout.summary}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <p>{event.summary}</p>
        </EuiText>

        {event.root_cause && (
          <>
            <EuiSpacer size="m" />
            <EuiTitle size="xs">
              <h3>{TRANSLATIONS.flyout.rootCause}</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">
              <p>{event.root_cause}</p>
            </EuiText>
          </>
        )}

        {event.recommendations && event.recommendations.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiTitle size="xs">
              <h3>{TRANSLATIONS.flyout.recommendations}</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiPanel color="subdued" paddingSize="s">
              <EuiListGroup flush>
                {event.recommendations.map((rec, idx) => (
                  <EuiListGroupItem key={idx} label={rec} iconType="check" size="s" wrapText />
                ))}
              </EuiListGroup>
            </EuiPanel>
          </>
        )}

        {event.rule_names && event.rule_names.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiTitle size="xs">
              <h3>{TRANSLATIONS.flyout.rules}</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="xs" wrap>
              {event.rule_names.map((rule) => (
                <EuiFlexItem grow={false} key={rule}>
                  <EuiBadge>{rule}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </>
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>{TRANSLATIONS.flyout.close}</EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
