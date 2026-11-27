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
  formatNumber,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import {
  formatPercentageParts,
  formatRateParts,
} from '../../../services/unit_stats_client/format_stats';
import type {
  DeliverySeriesView,
  DestinationFailedView,
  FailureClassView,
} from '../../../services/unit_stats_client/types';
import {
  UNKNOWN_STAT_VALUE,
  formatDocsPerSec,
  splitFormattedBytes,
} from '../../stream_detail_overview/ingest_chart_statistics';
import {
  getFailureClasses,
  getFailureRangeSubtitle,
  hasDestinationFailures,
  hasFailures,
} from './destination_failures';
import { DeliveryChart } from './delivery_chart';
import { useDestinationFailures } from '../../unit_stats/use_destination_failures';
import { useTimeRangeUpdate } from '../../../hooks/use_time_range_update';
import { StatCell } from '../../stream_detail_overview/stat_cell';
import { DestinationFailureCausesTable } from './destination_failure_causes_table';
import { FlyoutPanel } from './flyout_panel';

/**
 * Whether the destination attempted any deliveries: a failure figure of `0` means attempts that
 * did not fail, and `null` means none were attempted.
 */
const hasDeliveryAttempts = ({
  total,
  authentication,
  authorization,
}: DestinationFailedView): boolean =>
  [total, authentication, authorization].some(
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

/** What the panel shows above the delivery, for a destination that writes to indices. */
export interface DeliveryTotalsInput {
  /**
   * The documents written to the indices listed below it, so it adds up with their Docs written
   * column. Undefined when unknown.
   */
  documents: { count?: number; loading: boolean };
  /** Omitted where storage is not reported, such as on serverless. */
  storage?: {
    /** Undefined when unknown. */
    bytes?: number;
    loading: boolean;
  };
}

/** The highest delivered count of a bucket of the chart, per second. */
const peakDeliveryRate = (series: DeliverySeriesView | undefined): number | undefined => {
  if (!series) {
    return undefined;
  }
  const delivered = series.points.map(({ total, failed }) => Math.max(0, total - failed));
  const bucketSec = series.bucketMs / 1000;
  return delivered.length > 0 && bucketSec > 0 ? Math.max(...delivered) / bucketSec : 0;
};

/**
 * The documents written to the indices listed below, the peak rate of the delivery chart, and
 * the storage of those indices.
 */
function DeliveryTotals({
  series,
  seriesLoading,
  documents,
  storage,
}: {
  series: DeliverySeriesView | undefined;
  /** The series shown is of the previous range until the new one arrives. */
  seriesLoading: boolean;
  documents: DeliveryTotalsInput['documents'];
  storage: DeliveryTotalsInput['storage'];
}) {
  const peakRate = peakDeliveryRate(series);
  const storageParts =
    storage?.bytes === undefined ? undefined : splitFormattedBytes(storage.bytes);

  return (
    <>
      <EuiFlexGroup responsive wrap={false} gutterSize="xl">
        <StatCell
          data-test-subj="streamsDestinationWrittenDocs"
          title={i18n.translate('xpack.streams.destinations.delivery.writtenDocsLabel', {
            defaultMessage: 'Docs written',
          })}
          value={
            documents.loading ? (
              <EuiLoadingSpinner size="m" />
            ) : documents.count === undefined ? (
              UNKNOWN_STAT_VALUE
            ) : (
              formatNumber(documents.count, '0,0')
            )
          }
          unit={
            documents.loading
              ? undefined
              : i18n.translate('xpack.streams.destinations.delivery.writtenDocsUnit', {
                  defaultMessage: 'docs',
                })
          }
        />
        <StatCell
          data-test-subj="streamsDestinationPeakDeliveryRate"
          title={i18n.translate('xpack.streams.destinations.delivery.peakRateLabel', {
            defaultMessage: 'Peak delivery rate',
          })}
          value={
            seriesLoading ? (
              <EuiLoadingSpinner size="m" />
            ) : peakRate === undefined ? (
              UNKNOWN_STAT_VALUE
            ) : (
              formatDocsPerSec(peakRate)
            )
          }
          unit={
            seriesLoading
              ? undefined
              : i18n.translate('xpack.streams.destinations.delivery.peakRateUnit', {
                  defaultMessage: 'docs/sec',
                })
          }
        />
        {storage && (
          <StatCell
            data-test-subj="streamsDestinationStorageSize"
            title={i18n.translate('xpack.streams.destinations.delivery.storageSizeLabel', {
              defaultMessage: 'Storage size',
            })}
            value={
              storage.loading ? (
                <EuiLoadingSpinner size="m" />
              ) : (
                (storageParts?.value ?? UNKNOWN_STAT_VALUE)
              )
            }
            unit={storage.loading ? undefined : storageParts?.unit}
          />
        )}
      </EuiFlexGroup>
      <EuiHorizontalRule margin="m" />
    </>
  );
}

/** What the panel says, in subdued text, when there is nothing to show. */
function EmptyStateMessage({
  dataTestSubj,
  children,
}: React.PropsWithChildren<{ dataTestSubj: string }>) {
  return (
    <EuiText size="s" color="subdued" data-test-subj={dataTestSubj}>
      <p>{children}</p>
    </EuiText>
  );
}

/** The warning above the panel for a part of the stats that could not load. */
function PartialErrorCallout({ reason }: { reason: string }) {
  return (
    <>
      <KbnWarningCallout
        announceOnMount
        size="s"
        data-test-subj="streamsDestinationFailuresPartialError"
        title={i18n.translate('xpack.streams.destinations.failures.partialErrorTitle', {
          defaultMessage: 'Some stats could not be loaded',
        })}
        text={reason}
      />
      <EuiSpacer size="m" />
    </>
  );
}

/** The failures of the two classes: their stats, the chart beside them, and their causes below. */
function ClassFailures({
  failed,
  destinationType,
  chart,
}: {
  failed: DestinationFailedView;
  destinationType: string;
  chart: React.ReactNode;
}) {
  const failureClasses = getFailureClasses(failed);

  return (
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
        {chart && (
          <EuiFlexItem grow={3} css={{ alignSelf: 'center' }}>
            {chart}
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
  );
}

/** Failures that are neither of the two classes. The chart shows them as other failures. */
function OtherFailuresOnly({ chart }: { chart: React.ReactNode }) {
  return (
    <>
      <EmptyStateMessage dataTestSubj="streamsDestinationFailuresNoClasses">
        {i18n.translate('xpack.streams.destinations.failures.noClassFailures', {
          defaultMessage: 'No authentication or authorization failures in this time range.',
        })}
      </EmptyStateMessage>
      {chart && (
        <>
          <EuiSpacer size="m" />
          {chart}
        </>
      )}
    </>
  );
}

/**
 * What the panel shows under its warning, by what failed, from the most specific to the least:
 * failures of the two classes, then a part that could not load, then failures of no class, then
 * nothing failed, and last nothing attempted.
 */
function DeliveryOutcome({
  failed,
  hasPartialError,
  destinationType,
  chart,
}: {
  failed: DestinationFailedView;
  hasPartialError: boolean;
  destinationType: string;
  chart: React.ReactNode;
}) {
  if (hasDestinationFailures(failed)) {
    return <ClassFailures failed={failed} destinationType={destinationType} chart={chart} />;
  }

  // Part of the stats could not load, so it is not known whether anything failed. The series is
  // its own query, and shows what it has.
  if (hasPartialError) return <>{chart}</>;

  if (hasFailures(failed.total)) return <OtherFailuresOnly chart={chart} />;

  if (!hasDeliveryAttempts(failed)) {
    return (
      <EmptyStateMessage dataTestSubj="streamsDestinationFailuresNoData">
        {i18n.translate('xpack.streams.destinations.failures.noData', {
          defaultMessage: 'No delivery attempts in this time range.',
        })}
      </EmptyStateMessage>
    );
  }

  // Attempts, and none failed: the chart shows what was delivered.
  if (chart) return <>{chart}</>;

  return (
    <EmptyStateMessage dataTestSubj="streamsDestinationFailuresNone">
      {i18n.translate('xpack.streams.destinations.failures.noFailures', {
        defaultMessage: 'No delivery failures in this time range.',
      })}
    </EmptyStateMessage>
  );
}

/**
 * The delivery of a destination, for its flyout, over the range of the page's time picker. With
 * failures it shows authentication and authorization, each with its stats and its causes, and
 * the delivery chart. Its subtitle says what the figures are a share of: `Of events for the
 * selected time range`.
 *
 * It brings its own time picker. When nothing failed it shows what was delivered, and nothing
 * attempted is said as such. With `totals`, the panel starts with the documents delivered, as for
 * a local Elasticsearch destination.
 *
 * It is always there, so that the picker is always within reach: a range with no data must not take
 * away the control that changes it. It also says when it could not load. A part that could not
 * load, next to real values, is a warning above them, as on the Map.
 */
export function DestinationDeliverySection({
  destinationId,
  destinationType,
  totals,
}: {
  destinationId: string;
  destinationType: string;
  totals?: DeliveryTotalsInput;
}) {
  const { value, loading, error } = useDestinationFailures(destinationId);
  const { updateTimeRange } = useTimeRangeUpdate();

  return (
    <DestinationDeliveryView
      value={value}
      destinationType={destinationType}
      totals={totals}
      loading={loading}
      error={error}
      showTimePicker
      onBrushEnd={updateTimeRange}
    />
  );
}

export function DestinationDeliveryView({
  value,
  destinationType,
  totals,
  loading,
  error,
  showTimePicker,
  onBrushEnd,
}: {
  value: ReturnType<typeof useDestinationFailures>['value'];
  destinationType: string;
  totals?: DeliveryTotalsInput;
  loading: boolean;
  error?: Error;
  showTimePicker: boolean;
  onBrushEnd?: (range: { from: string; to: string }) => void;
}) {
  const failed = value?.stats.failed;
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

    const chart =
      failed.series && failed.series.points.length > 0 ? (
        <DeliveryChart series={failed.series} onBrushEnd={onBrushEnd} />
      ) : null;

    return (
      <>
        {partialError !== undefined && <PartialErrorCallout reason={partialError} />}
        {totals && (
          <DeliveryTotals
            series={failed.series}
            seriesLoading={loading}
            documents={totals.documents}
            storage={totals.storage}
          />
        )}
        <DeliveryOutcome
          failed={failed}
          hasPartialError={partialError !== undefined}
          destinationType={destinationType}
          chart={chart}
        />
      </>
    );
  };

  return (
    <FlyoutPanel
      data-test-subj="streamsDestinationDeliverySection"
      title={i18n.translate('xpack.streams.destinations.failures.titleDelivery', {
        defaultMessage: 'Delivery',
      })}
      subtitle={
        // What the figures are a share of is said here once, so the stats carry no noun. Without
        // failures there are no figures to name.
        failed && !loadError && hasDestinationFailures(failed)
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
