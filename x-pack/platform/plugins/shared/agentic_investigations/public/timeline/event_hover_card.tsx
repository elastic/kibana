/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiMarkdownFormat, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ImpactMapEvent, InvestigationImpactMapResponse } from '../../common';
import { formatTimelineClock } from '../../common';
import {
  EventAffects,
  eventAffectsAnything,
  EventChart,
  EventKindBadge,
} from '../conversation_templates/templates/investigation/flyout/impact_map_events';

const AFFECTS = i18n.translate('xpack.agenticInvestigations.timelineExpanded.affects', {
  defaultMessage: 'Affects',
});

/**
 * The key information about an event, on hover so it need not be opened: its name, what it
 * affects, a few lines of its description and, when it has one, its chart.
 */
export const EventHoverCard: React.FC<{
  event: ImpactMapEvent;
  impactMap: InvestigationImpactMapResponse;
}> = ({ event, impactMap }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div data-test-subj="agenticInvestigationsTimelineExpandedHover">
      {/* What kind of event it is, and when, before its name. */}
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        responsive={false}
        wrap
        css={{ marginBottom: euiTheme.size.xs }}
      >
        <EuiFlexItem grow={false}>
          <EventKindBadge kind={event.kind} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {formatTimelineClock(event.at)}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiText size="s">
        <strong>{event.title}</strong>
      </EuiText>
      {eventAffectsAnything(event, impactMap) && (
        <EuiFlexGroup
          gutterSize="xs"
          alignItems="center"
          responsive={false}
          wrap
          css={{ marginTop: euiTheme.size.s }}
        >
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {AFFECTS}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EventAffects event={event} impactMap={impactMap} />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      {event.description && (
        <EuiMarkdownFormat
          textSize="xs"
          css={css`
            margin-top: ${euiTheme.size.m};
            max-block-size: 8em;
            overflow: hidden;
            /* A sentence and its bullets, close together rather than set apart as prose. */
            p {
              margin-block-end: ${euiTheme.size.xs};
            }
            ul,
            ol {
              margin-block: 0;
            }
            li + li {
              margin-block-start: ${euiTheme.size.xxs};
            }
          `}
        >
          {event.description}
        </EuiMarkdownFormat>
      )}
      {event.evidence?.chart && (
        <div css={{ marginTop: euiTheme.size.m }}>
          <EventChart event={event} allEvents={impactMap.events} />
        </div>
      )}
    </div>
  );
};
