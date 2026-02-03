/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiCallOutProps } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiCallOut,
  EuiTextBlockTruncate,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTextColor,
  EuiToolTip,
  EuiLink,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import useToggle from 'react-use/lib/useToggle';
import { css } from '@emotion/react';
import { getPercentageFormatter } from '../../../../../../util/formatters';
import type { ProcessorMetrics } from '../../../state_management/simulation_state_machine';

type ProcessorMetricBadgesProps = ProcessorMetrics;

const formatter = getPercentageFormatter();

const messageStyles = css`
  overflow-wrap: anywhere;
`;

const ProcessorErrorMessage = ({ message }: { message: string }) => {
  const [expanded, toggleExpanded] = useToggle(false);
  const { euiTheme } = useEuiTheme();

  const CLAMP_LINES = 5;
  const LONG_MESSAGE_CHARACTER_THRESHOLD = 300;
  const shouldTruncate = message.length > LONG_MESSAGE_CHARACTER_THRESHOLD;

  return (
    <>
      {expanded ? (
        <div css={messageStyles}>{message}</div>
      ) : (
        <EuiTextBlockTruncate lines={CLAMP_LINES} cloneElement>
          <span css={messageStyles}>{message}</span>
        </EuiTextBlockTruncate>
      )}

      {shouldTruncate && (
        <EuiLink
          onClick={toggleExpanded}
          data-test-subj="streamsAppProcessorErrorMessageToggle"
          css={css`
            padding-top: ${euiTheme.size.xs};
          `}
        >
          {expanded
            ? i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.processorErrors.message.showLess',
                { defaultMessage: 'Show less' }
              )
            : i18n.translate(
                'xpack.streams.streamDetailView.managementTab.enrichment.processorErrors.message.showMore',
                { defaultMessage: 'Show full message' }
              )}
        </EuiLink>
      )}
    </>
  );
};

export const ProcessorMetricBadges = ({
  detected_fields,
  failed_rate,
  skipped_rate,
  parsed_rate,
}: ProcessorMetricBadgesProps) => {
  const detectedFieldsCount = detected_fields.length;
  const parsedRate = parsed_rate > 0 ? formatter.format(parsed_rate) : null;
  const skippedRate = skipped_rate > 0 ? formatter.format(skipped_rate) : null;
  const failedRate = failed_rate > 0 ? formatter.format(failed_rate) : null;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      {parsedRate && (
        <EuiFlexItem>
          <EuiToolTip
            position="top"
            content={i18n.translate('xpack.streams.processorMetricBadges.euiBadge.parsedRate', {
              defaultMessage:
                '{parsedRate} of the sampled documents were successfully parsed by this processor',
              values: { parsedRate },
            })}
          >
            <EuiTextColor color="success">
              <EuiFlexGroup gutterSize="xs">
                <EuiFlexItem grow={false}>
                  <EuiIcon type="check" />
                </EuiFlexItem>
                <EuiFlexItem>{parsedRate}</EuiFlexItem>
              </EuiFlexGroup>
            </EuiTextColor>
          </EuiToolTip>
        </EuiFlexItem>
      )}
      {failedRate && (
        <EuiFlexItem>
          <EuiToolTip
            position="top"
            content={i18n.translate('xpack.streams.processorMetricBadges.euiBadge.failedRate', {
              defaultMessage:
                '{failedRate} of the sampled documents were not parsed due to an error',
              values: { failedRate },
            })}
          >
            <span tabIndex={0}>
              <EuiTextColor color="danger">
                <EuiFlexGroup gutterSize="xs">
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="cross" />
                  </EuiFlexItem>
                  <EuiFlexItem>{failedRate}</EuiFlexItem>
                </EuiFlexGroup>
              </EuiTextColor>
            </span>
          </EuiToolTip>
        </EuiFlexItem>
      )}
      {skippedRate && (
        <EuiFlexItem>
          <EuiToolTip
            position="top"
            content={i18n.translate('xpack.streams.processorMetricBadges.euiBadge.skippedRate', {
              defaultMessage:
                '{skippedRate} of the sampled documents were skipped due to the set condition',
              values: { skippedRate },
            })}
          >
            <EuiTextColor color="default">{skippedRate}</EuiTextColor>
          </EuiToolTip>
        </EuiFlexItem>
      )}
      {detectedFieldsCount > 0 && (
        <EuiFlexItem>
          <EuiBadge
            color="hollow"
            title={i18n.translate('xpack.streams.processorMetricBadges.euiBadge.detectedFields', {
              defaultMessage:
                '{detectedFieldsCount, plural, one {# field was parsed on the sampled documents: } other {# fields were parsed on the sampled documents:\n}}{detectedFields}',
              values: { detectedFieldsCount, detectedFields: detected_fields.join('\n') },
            })}
          >
            {i18n.translate('xpack.streams.processorMetricBadges.fieldsBadgeLabel', {
              defaultMessage: '{detectedFieldsCount, plural, one {# field } other {# fields}}',
              values: { detectedFieldsCount },
            })}
          </EuiBadge>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const errorTitle = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.processorErrors.title',
  { defaultMessage: "Processor configuration invalid or doesn't match." }
);

export const ProcessorErrors = ({ metrics }: { metrics: ProcessorMetrics }) => {
  const { errors, parsed_rate } = metrics;

  const { euiTheme } = useEuiTheme();
  const [isErrorListExpanded, toggleErrorListExpanded] = useToggle(false);

  const visibleErrors = isErrorListExpanded ? errors : errors.slice(0, 2);
  const remainingCount = errors.length - 2;
  const shouldDisplayErrorToggle = remainingCount > 0;

  const getCalloutProps = (type: ProcessorMetrics['errors'][number]['type']): EuiCallOutProps => {
    const isWarningError = type === 'generic_processor_failure' && parsed_rate > 0;

    return {
      color: isWarningError ? 'warning' : 'danger',
    };
  };

  return (
    <>
      <EuiFlexGroup
        gutterSize="xs"
        direction="column"
        css={css`
          margin-top: ${euiTheme.size.m};
        `}
      >
        {visibleErrors.map((error, id) => (
          <EuiCallOut key={id} {...getCalloutProps(error.type)} size="s" title={errorTitle}>
            <ProcessorErrorMessage message={error.message} />
          </EuiCallOut>
        ))}
      </EuiFlexGroup>
      {shouldDisplayErrorToggle && !isErrorListExpanded && (
        <EuiButtonEmpty
          data-test-subj="streamsAppProcessorErrorsShowMoreButton"
          onClick={toggleErrorListExpanded}
          size="xs"
        >
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorErrors.showMore',
            {
              defaultMessage: 'Show {remainingCount} similar errors...',
              values: { remainingCount },
            }
          )}
        </EuiButtonEmpty>
      )}
      {shouldDisplayErrorToggle && isErrorListExpanded && (
        <EuiButtonEmpty
          data-test-subj="streamsAppProcessorErrorsShowLessButton"
          onClick={toggleErrorListExpanded}
          size="xs"
        >
          {i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processorErrors.showLess',
            { defaultMessage: 'Show less errors' }
          )}
        </EuiButtonEmpty>
      )}
    </>
  );
};
