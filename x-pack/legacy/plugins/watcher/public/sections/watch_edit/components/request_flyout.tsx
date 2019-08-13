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

export class RequestFlyout extends PureComponent {
  static propTypes = {
    close: PropTypes.func.isRequired,
    watch: PropTypes.object.isRequired,
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
    const { watch, close } = this.props;
    const { id, watchString } = watch;
    const endpoint = `PUT _watcher/watch/${id || '<watchId>'}`;
    const request = `${endpoint}\n${watchString}`;

    return (
      <EuiFlyout maxWidth={480} onClose={close}>
        <EuiFlyoutHeader>
          <EuiTitle>
            <h2>
              {id ? (
                <FormattedMessage
                  id="xpack.watcher.requestFlyout.namedTitle"
                  defaultMessage="Request for '{id}'"
                  values={{ id }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.watcher.requestFlyout.unnamedTitle"
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
                id="xpack.watcher.requestFlyout.descriptionText"
                defaultMessage="This Elasticsearch request will create or update this watch."
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
              id="xpack.watcher.requestFlyout.closeButtonLabel"
              defaultMessage="Close"
            />
          </EuiButtonEmpty>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
}
