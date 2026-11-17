/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import {
  formatPercentageParts,
  formatRateParts,
} from '../../../services/unit_stats_client/format_stats';
import type {
  DestinationFailedView,
  FailureClassView,
} from '../../../services/unit_stats_client/types';
import {
  getFailureClasses,
  getFailureRangeSubtitle,
  hasDestinationFailures,
} from '../../unit_stats/destination_failures';
import { DeliveryChart } from '../../unit_stats/delivery_chart';
import { useDestinationFailures } from '../../unit_stats/use_destination_failures';
import { useTimeRangeUpdate } from '../../../hooks/use_time_range_update';
import { StatCell } from '../../stream_detail_overview/stat_cell';
import { DestinationFailureCausesTable } from './destination_failure_causes_table';
import { FlyoutPanel } from './flyout_panel';

/** Whether the destination reported anything about its failures: a `null` is not known. */
const hasFailureData = ({ authentication, authorization }: DestinationFailedView): boolean =>
  [authentication, authorization].some(
    ({ percentage, rate }) => percentage !== null || rate !== null
  );

/**
 * One failure class: its name, and its percentage and its rate as stats of the flyout. What the
 * figures are a share of is in the subtitle of the panel, not in each unit.
 */
function FailureClassStats({
  title,
  failureClass,
  dataTestSubj,
}: {
  title: string;
  failureClass: FailureClassView;
  dataTestSubj: string;
}) {
  const percentage = formatPercentageParts(failureClass.percentage);
  const rate = formatRateParts(failureClass.rate);

  return (
    <div data-test-subj={dataTestSubj}>
      <EuiTitle size="xxs">
        <h4>{title}</h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup responsive wrap={false} gutterSize="m">
        <StatCell
          data-test-subj={`${dataTestSubj}Percentage`}
          title={i18n.translate('xpack.streams.destinations.failures.percentageLabel', {
            defaultMessage: 'Percentage',
          })}
          value={percentage.value}
          unit={percentage.unit === '' ? undefined : percentage.unit}
        />
        <StatCell
          data-test-subj={`${dataTestSubj}Rate`}
          title={i18n.translate('xpack.streams.destinations.failures.rateLabel', {
            defaultMessage: 'Rate',
          })}
          value={rate.value}
          unit={rate.unit === '' ? undefined : rate.unit}
        />
      </EuiFlexGroup>
    </div>
  );
}

/** The causes of one failure class as a table. A class with none, such as a request that was refused as a whole, has no table. */
function FailureClassCauses({
  title,
  failureClass,
  destinationType,
  dataTestSubj,
}: {
  title: string;
  failureClass: FailureClassView;
  destinationType: string;
  dataTestSubj: string;
}) {
  return (
    <div>
      <EuiTitle size="xxs">
        <h4>{title}</h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <DestinationFailureCausesTable
        causes={failureClass.breakdown}
        caption={i18n.translate('xpack.streams.destinations.failures.tableCaption', {
          defaultMessage: '{class} failures by cause',
          values: { class: title },
        })}
        destinationType={destinationType}
        dataTestSubj={dataTestSubj}
      />
    </div>
  );
}

/**
 * The delivery failures of a destination, for its flyout, over the range of the page's time picker:
 * authentication and authorization, each with its stats and its causes. It follows the ingest chart
 * panel of a local Elasticsearch destination, and its subtitle says what the figures are a share
 * of: `Of events for the selected time range`. `showTimePicker` is for a destination that has no
 * other picker in its flyout.
 *
 * It is always there, so that the picker is always within reach: a range with no data must not take
 * away the control that changes it. It says so when there is nothing to report, when it has no data,
 * and when it could not load. A part that could not load, next to real values, is a warning above
 * them, as on the Map.
 */
export function DestinationFailuresSection({
  destinationId,
  destinationType,
  showTimePicker,
}: {
  destinationId: string;
  destinationType: string;
  showTimePicker: boolean;
}) {
  const { value, loading, error } = useDestinationFailures(destinationId);
  const { updateTimeRange } = useTimeRangeUpdate();

  return (
    <DestinationFailuresView
      value={value}
      destinationType={destinationType}
      loading={loading}
      error={error}
      showTimePicker={showTimePicker}
      onBrushEnd={updateTimeRange}
    />
  );
}

export function DestinationFailuresView({
  value,
  destinationType,
  loading,
  error,
  showTimePicker,
  onBrushEnd,
}: {
  value: ReturnType<typeof useDestinationFailures>['value'];
  destinationType: string;
  loading: boolean;
  error?: Error;
  showTimePicker: boolean;
  onBrushEnd?: (range: { from: string; to: string }) => void;
}) {
  const failed = value?.stats.failed;
  const failureClasses = failed ? getFailureClasses(failed) : [];
  const loadError = error?.message ?? (value?.status === 'error' ? value.error?.reason : undefined);
  const partialError = value?.status === 'ready' ? value.error?.reason : undefined;

  const renderBody = () => {
    if (loading && !value) {
      return (
        <EuiFlexGroup justifyContent="center" data-test-subj="streamsDestinationFailuresLoading">
          <EuiLoadingSpinner size="l" />
        </EuiFlexGroup>
      );
    }

    if (loadError !== undefined || !failed) {
      return (
        <KbnDangerCallout
          announceOnMount
          size="s"
          data-test-subj="streamsDestinationFailuresError"
          title={i18n.translate('xpack.streams.destinations.failures.errorTitle', {
            defaultMessage: 'Could not load delivery failures',
          })}
          text={loadError}
        />
      );
    }

    return (
      <>
        {partialError !== undefined && (
          <>
            <KbnWarningCallout
              announceOnMount
              size="s"
              data-test-subj="streamsDestinationFailuresPartialError"
              title={i18n.translate('xpack.streams.destinations.failures.partialErrorTitle', {
                defaultMessage: 'Some stats could not be loaded',
              })}
              text={partialError}
            />
            <EuiSpacer size="m" />
          </>
        )}
        {hasDestinationFailures(failed) ? (
          <>
            <EuiFlexGroup gutterSize="xl" responsive>
              <EuiFlexItem grow={2}>
                {failureClasses.map(({ key, title, failureClass }, index) => (
                  <React.Fragment key={key}>
                    {index > 0 && <EuiHorizontalRule margin="m" />}
                    <FailureClassStats
                      title={title}
                      failureClass={failureClass}
                      dataTestSubj={`streamsDestinationFailures${key}`}
                    />
                  </React.Fragment>
                ))}
              </EuiFlexItem>
              {failed.series && (
                <EuiFlexItem grow={3} css={{ alignSelf: 'center' }}>
                  <DeliveryChart series={failed.series} onBrushEnd={onBrushEnd} />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            {failureClasses
              .filter(({ failureClass }) => failureClass.breakdown.length > 0)
              .map(({ key, title, failureClass }) => (
                <React.Fragment key={key}>
                  <EuiHorizontalRule margin="m" />
                  <FailureClassCauses
                    title={title}
                    failureClass={failureClass}
                    destinationType={destinationType}
                    dataTestSubj={`streamsDestinationFailures${key}Causes`}
                  />
                </React.Fragment>
              ))}
          </>
        ) : hasFailureData(failed) ? (
          <EuiText size="s" color="subdued" data-test-subj="streamsDestinationFailuresNone">
            <p>
              {i18n.translate('xpack.streams.destinations.failures.noFailures', {
                defaultMessage: 'No authentication or authorization failures in this time range.',
              })}
            </p>
          </EuiText>
        ) : (
          // A part that could not load is already said above, and is not a lack of data.
          partialError === undefined && (
            <EuiText size="s" color="subdued" data-test-subj="streamsDestinationFailuresNoData">
              <p>
                {i18n.translate('xpack.streams.destinations.failures.noData', {
                  defaultMessage: 'No delivery data in this time range.',
                })}
              </p>
            </EuiText>
          )
        )}
      </>
    );
  };

  return (
    <FlyoutPanel
      data-test-subj="streamsDestinationFailuresSection"
      title={i18n.translate('xpack.streams.destinations.failures.title', {
        defaultMessage: 'Delivery failures',
      })}
      subtitle={
        // What the figures are a share of is said here once, so the stats carry no noun. Without
        // failure data there is nothing to name, and a placeholder unit would name the wrong thing.
        failed && !loadError && hasFailureData(failed)
          ? getFailureRangeSubtitle(failed)
          : i18n.translate('xpack.streams.destinations.failures.subtitle', {
              defaultMessage: 'For the selected time range',
            })
      }
      showTimePicker={showTimePicker}
    >
      {renderBody()}
    </FlyoutPanel>
  );
}
