/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';

export const COLUMNAR_INDEX_MODE_SWITCH_TEST_SUBJ = 'columnarIndexModeSwitch';

interface Props {
  checked: boolean;
  onChange: () => void;
  /**
   * Not every logs data stream of the integration declares columnar readiness: the switch can't
   * be turned on, with an explanation. It can still be turned off.
   */
  notReady?: boolean;
  /** Titles of the logs data streams that aren't ready, when some are. */
  notReadyDataStreams?: string[];
}

const NotReadyMessage: React.FunctionComponent<{ checked: boolean; dataStreams: string[] }> = ({
  checked,
  dataStreams,
}) => {
  // Still on columnar from an earlier version: it can be turned off, not back on.
  if (checked) {
    return dataStreams.length > 0 ? (
      <FormattedMessage
        id="xpack.fleet.createPackagePolicy.stepConfigure.columnarIndexModeNoLongerAllReady"
        defaultMessage="This integration isn't columnar-ready anymore: {dataStreams} {count, plural, one {doesn't} other {don't}} support columnar storage. You can turn the columnar index mode off, but not back on until every log data stream is ready."
        values={{ dataStreams: dataStreams.join(', '), count: dataStreams.length }}
      />
    ) : (
      <FormattedMessage
        id="xpack.fleet.createPackagePolicy.stepConfigure.columnarIndexModeNoLongerReady"
        defaultMessage="This integration isn't columnar-ready anymore. You can turn the columnar index mode off, but not back on until every log data stream is ready."
      />
    );
  }
  return dataStreams.length > 0 ? (
    <FormattedMessage
      id="xpack.fleet.createPackagePolicy.stepConfigure.columnarIndexModeNotAllReady"
      defaultMessage="This integration isn't columnar-ready: {dataStreams} {count, plural, one {doesn't} other {don't}} support columnar storage yet, and every log data stream has to. Its log data streams use LogsDB."
      values={{ dataStreams: dataStreams.join(', '), count: dataStreams.length }}
    />
  ) : (
    <FormattedMessage
      id="xpack.fleet.createPackagePolicy.stepConfigure.columnarIndexModeNotReady"
      defaultMessage="This integration isn't columnar-ready yet. Its log data streams use LogsDB."
    />
  );
};

export const ColumnarIndexModeSwitch: React.FunctionComponent<Props> = ({
  checked,
  onChange,
  notReady = false,
  notReadyDataStreams = [],
}) => (
  <>
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiSwitch
          data-test-subj={COLUMNAR_INDEX_MODE_SWITCH_TEST_SUBJ}
          label={i18n.translate(
            'xpack.fleet.createPackagePolicy.stepConfigure.columnarIndexModeLabel',
            {
              defaultMessage: 'Columnar index mode',
            }
          )}
          checked={checked}
          onChange={onChange}
          disabled={notReady && !checked}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBetaBadge
          size="s"
          alignment="middle"
          label={i18n.translate(
            'xpack.fleet.createPackagePolicy.stepConfigure.columnarIndexModeTechPreviewBadge',
            { defaultMessage: 'Technical preview' }
          )}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="s" />
    <EuiText color="subdued" size="xs">
      <EuiFlexGroup alignItems="flexStart" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="info" color="subdued" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem>
          {!notReady ? (
            <FormattedMessage
              id="xpack.fleet.createPackagePolicy.stepConfigure.columnarIndexModeDescription"
              defaultMessage="Stores this integration's log data streams in the logsdb_columnar index mode: each field once, as doc values, with no inverted index except on text fields. Applies from the next rollover; existing data isn't rewritten."
            />
          ) : (
            <span data-test-subj="columnarIndexModeNotReady">
              <NotReadyMessage checked={checked} dataStreams={notReadyDataStreams} />
            </span>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiText>
  </>
);
