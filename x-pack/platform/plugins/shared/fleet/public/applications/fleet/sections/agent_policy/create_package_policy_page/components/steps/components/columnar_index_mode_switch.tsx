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
  disabled?: boolean;
  onChange: () => void;
  /**
   * Titles of the logs data streams the package explicitly marks as `unsupported`; they stay on
   * LogsDB no matter what the toggle says. Each one also carries a note in its own section.
   */
  unsupportedDataStreams?: string[];
  /**
   * The integration has logs data streams but none declares columnar readiness: the switch is
   * shown off and disabled, with an explanation.
   */
  notReady?: boolean;
  /**
   * The user opted in, but this package version has no columnar-ready logs data stream left:
   * the switch stays visible to tell the user the data streams go back to LogsDB.
   */
  withdrawn?: boolean;
}

export const ColumnarIndexModeSwitch: React.FunctionComponent<Props> = ({
  checked,
  disabled = false,
  onChange,
  unsupportedDataStreams = [],
  notReady = false,
  withdrawn = false,
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
          disabled={disabled}
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
    {/* One help line, like Fleet's other switches: a state that needs explaining replaces the
        description rather than stacking under it. */}
    <EuiText color="subdued" size="xs">
      <EuiFlexGroup alignItems="flexStart" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon
            type={withdrawn ? 'warning' : 'info'}
            color={withdrawn ? 'warning' : 'subdued'}
            aria-hidden={true}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          {withdrawn ? (
            <span data-test-subj="columnarIndexModeWithdrawn">
              <FormattedMessage
                id="xpack.fleet.createPackagePolicy.stepConfigure.columnarIndexModeWithdrawn"
                defaultMessage="This version of the integration no longer supports columnar storage. Its log data streams move back to LogsDB at the next rollover."
              />
            </span>
          ) : notReady ? (
            <span data-test-subj="columnarIndexModeNotReady">
              <FormattedMessage
                id="xpack.fleet.createPackagePolicy.stepConfigure.columnarIndexModeNotReady"
                defaultMessage="This integration isn't columnar-ready yet. Its log data streams use LogsDB."
              />
            </span>
          ) : (
            <>
              <FormattedMessage
                id="xpack.fleet.createPackagePolicy.stepConfigure.columnarIndexModeDescription"
                defaultMessage="Stores this integration's log data streams in the logsdb_columnar index mode: each field once, as doc values, with no inverted index except on text fields. Applies from the next rollover; existing data isn't rewritten."
              />
              {unsupportedDataStreams.length > 0 && (
                <>
                  {' '}
                  <span data-test-subj="columnarIndexModeUnsupportedDataStreams">
                    <FormattedMessage
                      id="xpack.fleet.createPackagePolicy.stepConfigure.columnarIndexModeUnsupportedDataStreams"
                      defaultMessage="{dataStreams} {count, plural, one {doesn't} other {don't}} support columnar storage and {count, plural, one {stays} other {stay}} on LogsDB."
                      values={{
                        dataStreams: unsupportedDataStreams.join(', '),
                        count: unsupportedDataStreams.length,
                      }}
                    />
                  </span>
                </>
              )}
            </>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiText>
  </>
);
