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
  EuiLink,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';

import { useStartServices } from '../../../../../../hooks';

export const COLUMNAR_INDEX_MODE_SWITCH_TEST_SUBJ = 'columnarIndexModeSwitch';

interface Props {
  checked: boolean;
  onChange: () => void;
  /**
   * Not every logs data stream of the integration declares columnar readiness: the switch can't
   * be turned on. It can still be turned off.
   */
  notReady?: boolean;
}

export const ColumnarIndexModeSwitch: React.FunctionComponent<Props> = ({
  checked,
  onChange,
  notReady = false,
}) => {
  const { docLinks } = useStartServices();
  const learnMoreLink = (
    <EuiLink href={docLinks.links.fleet.datastreamsLogsdbColumnar} target="_blank" external>
      {i18n.translate('xpack.fleet.createPackagePolicy.stepConfigure.columnarIndexModeLearnMore', {
        defaultMessage: 'Learn more',
      })}
    </EuiLink>
  );

  return (
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
                defaultMessage="Enable LogsDB columnar mode. {learnMoreLink}"
                values={{ learnMoreLink }}
              />
            ) : (
              <span data-test-subj="columnarIndexModeNotReady">
                <FormattedMessage
                  id="xpack.fleet.createPackagePolicy.stepConfigure.columnarIndexModeNotReady"
                  defaultMessage="This integration isn't columnar-ready yet. {learnMoreLink}"
                  values={{ learnMoreLink }}
                />
              </span>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiText>
    </>
  );
};
