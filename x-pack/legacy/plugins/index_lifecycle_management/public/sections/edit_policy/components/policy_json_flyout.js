/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import PropTypes from 'prop-types';

import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
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
    return JSON.stringify(
      {
        policy: {
          phases,
        },
      },
      null,
      2
    );
  }

  render() {
    const { lifecycle, close, policyName } = this.props;
    const endpoint = `PUT _ilm/policy/${policyName || '<policyName>'}`;
    const request = `${endpoint}\n${this.getEsJson(lifecycle)}`;

    return (
      <EuiFlyout maxWidth={480} onClose={close}>
        <EuiFlyoutHeader>
          <EuiTitle>
            <h2>
              {policyName ? (
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.policyJsonFlyout.namedTitle"
                  defaultMessage="Request for '{policyName}'"
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
                defaultMessage="This Elasticsearch request will create or update this index lifecycle policy."
              />
            </p>
          </EuiText>

          <EuiSpacer />

          <EuiCodeBlock language="json" isCopyable>
            {request}
          </EuiCodeBlock>
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          <EuiButtonEmpty iconType="cross" onClick={close} flush="left">
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.policyJsonFlyout.closeButtonLabel"
              defaultMessage="Close"
            />
          </EuiButtonEmpty>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
}
