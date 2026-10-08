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
   * Logs data streams the package explicitly marks as `unsupported`; they stay on LogsDB no
   * matter what the toggle says, so the user is told which ones and why.
   */
  unsupportedDataStreams?: string[];
}

export const ColumnarIndexModeSwitch: React.FunctionComponent<Props> = ({
  checked,
  disabled = false,
  onChange,
  unsupportedDataStreams = [],
}) => (
  <>
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiSwitch
          data-test-subj={COLUMNAR_INDEX_MODE_SWITCH_TEST_SUBJ}
          label={i18n.translate('xpack.fleet.integrations.settings.columnarIndexModeLabel', {
            defaultMessage: 'Columnar index mode',
          })}
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
            'xpack.fleet.integrations.settings.columnarIndexModeTechPreviewBadge',
            { defaultMessage: 'Technical preview' }
          )}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="s" />
    <EuiText color="subdued" size="xs">
      <EuiFlexGroup alignItems="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiIcon type="info" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <FormattedMessage
            id="xpack.fleet.integrations.settings.columnarIndexModeDescription"
            defaultMessage="Stores the integration's log data streams in the logsdb_columnar index mode: fields are stored once as doc values, with no inverted index except for text fields. Takes effect on the next rollover. Existing data is not rewritten."
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {unsupportedDataStreams.length > 0 && (
        <>
          <EuiSpacer size="xs" />
          <EuiFlexGroup alignItems="center" gutterSize="none">
            <EuiFlexItem grow={false}>
              <EuiIcon type="warning" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <span data-test-subj="columnarIndexModeUnsupportedDataStreams">
                <FormattedMessage
                  id="xpack.fleet.integrations.settings.columnarIndexModeUnsupportedDataStreams"
                  defaultMessage="These data streams do not support columnar storage and stay on LogsDB: {dataStreams}"
                  values={{ dataStreams: unsupportedDataStreams.join(', ') }}
                />
              </span>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </EuiText>
  </>
);
