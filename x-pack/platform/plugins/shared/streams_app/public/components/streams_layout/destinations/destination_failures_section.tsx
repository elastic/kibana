/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import {
  formatFailureBasis,
  formatPercentageParts,
  formatRateParts,
} from '../../../services/unit_stats_client/format_stats';
import type {
  DestinationFailedView,
  FailureClassView,
} from '../../../services/unit_stats_client/types';
import { getFailureClasses, hasDestinationFailures } from '../../unit_stats/destination_failures';
import { useDestinationFailures } from '../../unit_stats/use_destination_failures';
import { StatCell } from '../../stream_detail_overview/stat_cell';
import { DestinationFailureCausesTable } from './destination_failure_causes_table';
import { FlyoutStatsPanel } from './flyout_stats_panel';

/** Whether the destination reported anything about its failures: a `null` is not known. */
const hasFailureData = ({ authentication, authorization }: DestinationFailedView): boolean =>
  [authentication, authorization].some(
    ({ percentage, rate }) => percentage !== null || rate !== null
  );

/**
 * One failure class: its name, its percentage and its rate as stats of the flyout, and its causes
 * as a table. A class with no causes, such as a request that was refused as a whole, has no table.
 * What the percentage is a share of is in its unit, as the flyout puts it in `docs/sec`.
 */
function FailureClassBlock({
  title,
  failureClass,
  dataTestSubj,
}: {
  title: string;
  failureClass: FailureClassView;
  dataTestSubj: string;
}) {
  const basis = formatFailureBasis(failureClass.unit);
  const percentage = formatPercentageParts(failureClass.percentage);
  const rate = formatRateParts(failureClass.rate);

  return (
    <div data-test-subj={dataTestSubj}>
      <EuiTitle size="xxs">
        <h4>{title}</h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup responsive wrap={false} gutterSize="xl">
        <StatCell
          data-test-subj={`${dataTestSubj}Percentage`}
          title={i18n.translate('xpack.streams.destinations.failures.percentageLabel', {
            defaultMessage: 'Percentage',
          })}
          value={percentage.value}
          unit={
            percentage.unit === ''
              ? undefined
              : i18n.translate('xpack.streams.destinations.failures.percentageUnit', {
                  defaultMessage: '% of {basis}',
                  values: { basis },
                })
          }
        />
        <StatCell
          data-test-subj={`${dataTestSubj}Rate`}
          title={i18n.translate('xpack.streams.destinations.failures.rateLabel', {
            defaultMessage: 'Rate',
          })}
          value={rate.value}
          unit={
            rate.unit === ''
              ? undefined
              : i18n.translate('xpack.streams.destinations.failures.rateUnit', {
                  defaultMessage: '{basis}/sec',
                  values: { basis },
                })
          }
        />
      </EuiFlexGroup>
      {failureClass.breakdown.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <DestinationFailureCausesTable
            causes={failureClass.breakdown}
            caption={i18n.translate('xpack.streams.destinations.failures.tableCaption', {
              defaultMessage: '{class} failures by cause',
              values: { class: title },
            })}
            dataTestSubj={`${dataTestSubj}Causes`}
          />
        </>
      )}
    </div>
  );
}

/**
 * The delivery failures of a destination, for its flyout, over the range of the page's time picker:
 * authentication and authorization, each with its stats and its causes. It follows the ingest chart
 * panel of a local Elasticsearch destination, with the subtitle `For selected time range`.
 * `showTimePicker` is for a destination that has no other picker in its flyout.
 *
 * It is always there, so that the picker is always within reach: a range with no data must not take
 * away the control that changes it. It says so when there is nothing to report, when it has no data,
 * and when it could not load. A part that could not load, next to real values, is a warning above
 * them, as on the Map.
 */
export function DestinationFailuresSection({
  destinationId,
  showTimePicker,
}: {
  destinationId: string;
  showTimePicker: boolean;
}) {
  const { value, loading, error } = useDestinationFailures(destinationId);
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
          getFailureClasses(failed).map(({ key, title, failureClass }, index) => (
            <React.Fragment key={key}>
              {index > 0 && <EuiHorizontalRule margin="m" />}
              <FailureClassBlock
                title={title}
                failureClass={failureClass}
                dataTestSubj={`streamsDestinationFailures${key}`}
              />
            </React.Fragment>
          ))
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
    <FlyoutStatsPanel
      data-test-subj="streamsDestinationFailuresSection"
      title={i18n.translate('xpack.streams.destinations.failures.title', {
        defaultMessage: 'Delivery failures',
      })}
      subtitle={i18n.translate('xpack.streams.destinations.failures.subtitle', {
        defaultMessage: 'For selected time range',
      })}
      showTimePicker={showTimePicker}
    >
      {renderBody()}
    </FlyoutStatsPanel>
  );
}
