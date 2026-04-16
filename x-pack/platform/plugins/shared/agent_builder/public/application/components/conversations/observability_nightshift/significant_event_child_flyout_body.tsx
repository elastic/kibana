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
  EuiHealth,
  EuiHorizontalRule,
  EuiText,
} from '@elastic/eui';
import type { EuiBadgeProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { NightshiftInfoPanel } from './nightshift_info_panel';
import { NightshiftMetadataIconCard } from './nightshift_metadata_icon_row';
import { NightshiftStreamsMetricTiles } from './nightshift_streams_metric_tiles';
import { RemediationPlanPanel } from './remediation_plan_panel';

export interface SignificantEventDetailFields {
  id: string;
  label: string;
  subtitle: string;
  severityLabel: string;
  severityColor: EuiBadgeProps['color'];
}

export interface SignificantEventChildFlyoutBodyProps {
  event: SignificantEventDetailFields;
}

export const SignificantEventChildFlyoutBody: React.FC<SignificantEventChildFlyoutBodyProps> = ({
  event,
}) => {

  const summaryPanelTitle = i18n.translate(
    'xpack.agentBuilder.observabilityNightshift.sigEvents.childSummaryTitle',
    {
      defaultMessage: 'Summary',
    }
  );

  const generalInfoTitle = i18n.translate(
    'xpack.agentBuilder.observabilityNightshift.sigEvents.childGeneralInfoTitle',
    {
      defaultMessage: 'General information',
    }
  );

  const summaryBody = useMemo(
    () =>
      i18n.translate('xpack.agentBuilder.observabilityNightshift.sigEvents.childSummaryBody', {
        defaultMessage:
          'This signal was raised on {stream}. {title} reflects a statistically significant deviation from the expected pattern for the selected window—review downstream dependencies and blast radius before changes propagate.',
        values: { stream: event.subtitle, title: event.label },
      }),
    [event.label, event.subtitle]
  );

  const metaSeverityTitle = i18n.translate(
    'xpack.agentBuilder.observabilityNightshift.sigEvents.childMetaSeverity',
    {
      defaultMessage: 'Severity',
    }
  );

  const metaStreamTitle = i18n.translate(
    'xpack.agentBuilder.observabilityNightshift.sigEvents.childMetaStream',
    {
      defaultMessage: 'Relevance',
    }
  );

  const metaWindowTitle = i18n.translate(
    'xpack.agentBuilder.observabilityNightshift.sigEvents.childMetaWindow',
    {
      defaultMessage: 'Suggestions',
    }
  );

  const metaWindowValue = i18n.translate(
    'xpack.agentBuilder.observabilityNightshift.sigEvents.childMetaWindowValue',
    {
      defaultMessage: '2',
    }
  );

  const severityHealthColor = useMemo(() => {
    if (event.severityColor === 'danger') {
      return 'danger' as const;
    }
    if (event.severityColor === 'warning') {
      return 'warning' as const;
    }
    return 'subdued' as const;
  }, [event.severityColor]);

  const generalInfoDescriptionItems = useMemo(() => {
    return [
      {
        title: i18n.translate(
          'xpack.agentBuilder.observabilityNightshift.sigEvents.childGeneralTermStream',
          {
            defaultMessage: 'Stream',
          }
        ),
        description: event.subtitle,
      },
      {
        title: i18n.translate(
          'xpack.agentBuilder.observabilityNightshift.sigEvents.childGeneralTermSeverity',
          {
            defaultMessage: 'Severity',
          }
        ),
        description: event.severityLabel,
      },
      {
        title: i18n.translate(
          'xpack.agentBuilder.observabilityNightshift.sigEvents.childGeneralTermBaseline',
          {
            defaultMessage: 'Baseline',
          }
        ),
        description: i18n.translate(
          'xpack.agentBuilder.observabilityNightshift.sigEvents.childGeneralDescBaseline',
          {
            defaultMessage:
              '7-day rolling average with hour-of-day cohort; minimum density enforced for sparse streams.',
          }
        ),
      },
      {
        title: i18n.translate(
          'xpack.agentBuilder.observabilityNightshift.sigEvents.childGeneralTermDetection',
          {
            defaultMessage: 'Detection',
          }
        ),
        description: i18n.translate(
          'xpack.agentBuilder.observabilityNightshift.sigEvents.childGeneralDescDetection',
          {
            defaultMessage:
              'Flags statistically significant deviation from the learned pattern for the selected window.',
          }
        ),
      },
      {
        title: i18n.translate(
          'xpack.agentBuilder.observabilityNightshift.sigEvents.childGeneralTermGuidance',
          {
            defaultMessage: 'Guidance',
          }
        ),
        description: i18n.translate(
          'xpack.agentBuilder.observabilityNightshift.sigEvents.childGeneralDescGuidance',
          {
            defaultMessage:
              'Confirm blast radius and downstream dependencies before remediation; attach context from related services.',
          }
        ),
      },
    ];
  }, [event.severityLabel, event.subtitle]);

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="agentBuilderSigEventChildContent">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" responsive={true} wrap>
          <EuiFlexItem grow={true}>
            <NightshiftMetadataIconCard
              hideIcon
              title={metaSeverityTitle}
              value={
                <EuiHealth color={severityHealthColor}>{event.severityLabel}</EuiHealth>
              }
            />
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <NightshiftMetadataIconCard
              hideIcon
              title={metaStreamTitle}
              value={<EuiBadge color="accent">75</EuiBadge>}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <NightshiftMetadataIconCard hideIcon title={metaWindowTitle} value={metaWindowValue} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <NightshiftInfoPanel title={summaryPanelTitle}>
          <EuiText size="s">
            <p>{summaryBody}</p>
          </EuiText>
        </NightshiftInfoPanel>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <NightshiftStreamsMetricTiles />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <NightshiftInfoPanel title={generalInfoTitle}>
          {generalInfoDescriptionItems.map((listItem, index) => (
            <React.Fragment key={listItem.title}>
              <EuiDescriptionList
                type="column"
                columnWidths={[1, 2]}
                compressed
                listItems={[listItem]}
              />
              {index < generalInfoDescriptionItems.length - 1 ? (
                <EuiHorizontalRule margin="m" />
              ) : null}
            </React.Fragment>
          ))}
        </NightshiftInfoPanel>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <RemediationPlanPanel />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
