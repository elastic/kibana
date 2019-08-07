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

import {
  EuiButton,
  EuiCodeEditor,
  EuiCopy,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiPortal,
  EuiSpacer,
  EuiText,
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
    }, null, 2);
  }

  render() {
    const { lifecycle, close, policyName } = this.props;
    const endpoint = `PUT _ilm/policy/${policyName || '{policyName}'}\n`;
    const request = `${endpoint}${this.getEsJson(lifecycle)}`;

    return (
      <EuiPortal>
        <EuiFlyout maxWidth={480} onClose={close}>
          <EuiFlyoutHeader>
            <EuiTitle>
              <h2>
                {policyName ? (
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.policyJsonFlyout.namedTitle"
                    defaultMessage="Request for {policyName}"
                    values={{ policyName }}
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.policyJsonFlyout.unnamedTitle"
                    defaultMessage="Request"
                  />
                )}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>

          <EuiFlyoutBody>
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.policyJsonFlyout.descriptionText"
                  defaultMessage="This is the underlying request to Elasticsearch that will create or update this index lifecycle policy."
                />
              </p>
            </EuiText>

            <EuiSpacer />

            <EuiCodeEditor
              mode="json"
              theme="textmate"
              isReadOnly
              setOptions={{ maxLines: Infinity, useWorker: false }}
              value={request}
              editorProps={{
                $blockScrolling: Infinity
              }}
            />
          </EuiFlyoutBody>

          <EuiFlyoutFooter>
            <EuiCopy textToCopy={request}>
              {copy => (
                <EuiButton
                  onClick={() => {
                    copy();
                    toastNotifications.add(i18n.translate(
                      'xpack.indexLifecycleMgmt.editPolicy.policyJsonFlyout.copiedToClipboardMessage',
                      {
                        defaultMessage: 'Request copied to clipboard'
                      }
                    ));
                  }}
                >
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.policyJsonFlyout.copyToClipboardButton"
                    defaultMessage="Copy to clipboard"
                  />
                </EuiButton>
              )}
            </EuiCopy>
          </EuiFlyoutFooter>
        </EuiFlyout>
      </EuiPortal>
    );
  }
}
