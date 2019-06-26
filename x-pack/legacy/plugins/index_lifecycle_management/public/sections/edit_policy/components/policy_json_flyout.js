/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import PropTypes from 'prop-types';
import { toastNotifications } from 'ui/notify';
import copy from 'copy-to-clipboard';

import {
  EuiButton,
  EuiCodeBlock,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiPortal,
  EuiTitle,
} from '@elastic/eui';

export class PolicyJsonFlyout extends PureComponent {
  static propTypes = {
    close: PropTypes.func.isRequired,
    lifecycle: PropTypes.object.isRequired,
  };
  getEsJson({ phases }) {
    return JSON.stringify({
      policy: {
        phases
      }
    }, null, 4);
  }
  copyToClipboard(lifecycle) {
    copy(this.getEsJson(lifecycle));
    toastNotifications.add(i18n.translate(
      'xpack.indexLifecycleMgmt.editPolicy.policyJsonFlyout.copiedToClipboardMessage',
      {
        defaultMessage: 'JSON copied to clipboard'
      }
    ));
  }
  render() {
    const { lifecycle, close, policyName } = this.props;

    return (
      <EuiPortal>
        <EuiFlyout maxWidth={400} ownFocus onClose={close}>
          <EuiFlyoutHeader>
            <EuiTitle>
              <h2>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.policyJsonFlyout.title"
                  defaultMessage="JSON for index lifecycle policy {policyName}"
                  values={{ policyName }}
                />
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>

          <EuiFlyoutBody>
            <EuiCodeBlock
              language="json"
            >
              {this.getEsJson(lifecycle)}
            </EuiCodeBlock>
          </EuiFlyoutBody>

          <EuiFlyoutFooter>
            <EuiButton onClick={() => this.copyToClipboard(lifecycle)}>
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.policyJsonFlyout.copyToClipboardButton"
                defaultMessage="Copy to clipboard"
              />
            </EuiButton>
          </EuiFlyoutFooter>
        </EuiFlyout>
      </EuiPortal>
    );
  }
}
