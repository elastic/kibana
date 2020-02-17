/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable max-classes-per-file */

import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiLoadingSpinner,
  EuiButton,
} from '@elastic/eui';
import { FormattedMessage, FormattedTime } from '@kbn/i18n/react';
import * as React from 'react';
import { Unit } from '@elastic/datemath';

import euiStyled from '../../../../../../common/eui_styled_components';
import { LogTextSeparator } from './log_text_separator';
import { extendDatemath } from '../../../utils/datemath';

type Position = 'start' | 'end';

interface LogTextStreamLoadingItemViewProps {
  position: Position;
  /** topCursor.time || bottomCursor.time */
  timestamp?: number;
  /** startDate || endDate */
  rangeEdge?: string;
  className?: string;
  hasMore: boolean;
  isLoading: boolean;
  isStreaming: boolean;
  onExtendRange?: (newDate: string) => void;
  onStreamStart?: () => void;
}

export class LogTextStreamLoadingItemView extends React.PureComponent<
  LogTextStreamLoadingItemViewProps,
  {}
> {
  public render() {
    const {
      position,
      timestamp,
      rangeEdge,
      className,
      hasMore,
      isLoading,
      isStreaming,
      onExtendRange,
      onStreamStart,
    } = this.props;

    const shouldShowCta = !hasMore && !isStreaming;

    const extra = (
      <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="m">
        {isLoading || isStreaming ? (
          <ProgressSpinner />
        ) : shouldShowCta ? (
          <ProgressCta
            position={position}
            onStreamStart={onStreamStart}
            onExtendRange={onExtendRange}
            rangeEdge={rangeEdge}
          />
        ) : null}
      </EuiFlexGroup>
    );

    return (
      <ProgressEntryWrapper className={className} position={position}>
        {position === 'start' ? <>{extra}</> : null}
        <ProgressMessage timestamp={timestamp} />
        {position === 'end' ? <>{extra}</> : null}
      </ProgressEntryWrapper>
    );
  }
}

const ProgressEntryWrapper = euiStyled.div<{ position: Position }>`
  padding-left: ${props => props.theme.eui.euiSizeS};
  padding-top: ${props =>
    props.position === 'start' ? props.theme.eui.euiSizeL : props.theme.eui.euiSizeM};
  padding-bottom: ${props =>
    props.position === 'end' ? props.theme.eui.euiSizeL : props.theme.eui.euiSizeM};
`;

const ProgressMessage: React.FC<{ timestamp?: number }> = ({ timestamp }) => {
  return (
    <LogTextSeparator>
      <EuiTitle size="xxs">
        {timestamp ? (
          <FormattedMessage
            id="xpack.infra.logs.showingEntriesUntilTimestamp"
            defaultMessage="Showing entries until {timestamp}"
            values={{ timestamp: <FormattedTime value={timestamp} /> }}
          />
        ) : (
          <FormattedMessage
            id="xpack.infra.logs.noAdditionalEntriesFoundText"
            defaultMessage="No additional entries found"
          />
        )}
      </EuiTitle>
    </LogTextSeparator>
  );
};

const ProgressSpinner: React.FC = () => (
  <>
    <EuiFlexItem grow={false}>
      <EuiLoadingSpinner size="l" />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="s">
        <FormattedMessage
          id="xpack.infra.logs.loadingNewEntriesText"
          defaultMessage="Loading new entries..."
        />
      </EuiText>
    </EuiFlexItem>
  </>
);

const ProgressCta: React.FC<Pick<
  LogTextStreamLoadingItemViewProps,
  'position' | 'rangeEdge' | 'onExtendRange' | 'onStreamStart'
>> = ({ position, rangeEdge, onExtendRange, onStreamStart }) => {
  if (rangeEdge === 'now' && position === 'end') {
    return (
      <EuiButton onClick={onStreamStart} size="s">
        <FormattedMessage id="xpack.infra.logs.extendTimeframe" defaultMessage="Stream live" />
      </EuiButton>
    );
  }

  const iconType = position === 'start' ? 'arrowUp' : 'arrowDown';

  if (!rangeEdge) {
    return null;
  }

  const extendedRange = extendDatemath(rangeEdge, position === 'start' ? 'before' : 'after');

  if (!extendedRange || !('diffUnit' in extendedRange)) {
    return null;
  }

  return (
    <EuiButton
      onClick={() => {
        if (typeof onExtendRange === 'function') {
          onExtendRange(extendedRange.value);
        }
      }}
      iconType={iconType}
      size="s"
    >
      <ProgressExtendMessage amount={extendedRange.diffAmount} unit={extendedRange.diffUnit} />
    </EuiButton>
  );
};

const ProgressExtendMessage: React.FC<{ amount: number; unit: Unit }> = ({ amount, unit }) => {
  switch (unit) {
    case 'ms':
      return (
        <FormattedMessage
          id="xpack.infra.logs.extendTimeframe"
          defaultMessage="Extend timeframe {amount} milliseconds"
          values={{ amount }}
        />
      );
    case 's':
      return (
        <FormattedMessage
          id="xpack.infra.logs.extendTimeframe"
          defaultMessage="Extend timeframe {amount} seconds"
          values={{ amount }}
        />
      );
    case 'm':
      return (
        <FormattedMessage
          id="xpack.infra.logs.extendTimeframe"
          defaultMessage="Extend timeframe {amount} minutes"
          values={{ amount }}
        />
      );
    case 'h':
      return (
        <FormattedMessage
          id="xpack.infra.logs.extendTimeframe"
          defaultMessage="Extend timeframe {amount} hours"
          values={{ amount }}
        />
      );
    case 'd':
      return (
        <FormattedMessage
          id="xpack.infra.logs.extendTimeframe"
          defaultMessage="Extend timeframe {amount} days"
          values={{ amount }}
        />
      );
    case 'w':
      return (
        <FormattedMessage
          id="xpack.infra.logs.extendTimeframe"
          defaultMessage="Extend timeframe {amount} weeks"
          values={{ amount }}
        />
      );
    case 'M':
      return (
        <FormattedMessage
          id="xpack.infra.logs.extendTimeframe"
          defaultMessage="Extend timeframe {amount} months"
          values={{ amount }}
        />
      );
    case 'y':
      return (
        <FormattedMessage
          id="xpack.infra.logs.extendTimeframe"
          defaultMessage="Extend timeframe {amount} years"
          values={{ amount }}
        />
      );
    default:
      throw new TypeError('Unhandled unit: ' + unit);
  }
};
