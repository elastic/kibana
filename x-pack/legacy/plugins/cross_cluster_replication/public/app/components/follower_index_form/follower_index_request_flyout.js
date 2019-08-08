/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import PropTypes from 'prop-types';

import {
  EuiCodeBlock,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPortal,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { serializeFollowerIndex } from '../../../../common/services/follower_index_serialization';

export class FollowerIndexRequestFlyout extends PureComponent {
  static propTypes = {
    close: PropTypes.func.isRequired,
    name: PropTypes.string.isRequired,
    followerIndex: PropTypes.object.isRequired,
  };

  render() {
    const { name, followerIndex, close } = this.props;
    const endpoint = `PUT /${name ? name : '<followerIndexName>'}/_ccr/follow`;
    const payload = JSON.stringify(serializeFollowerIndex(followerIndex), null, 2);
    const request = `${endpoint}\n${payload}`;

    return (
      <EuiPortal>
        <EuiFlyout maxWidth={480} onClose={close}>
          <EuiFlyoutHeader>
            <EuiTitle>
              <h2>
                {name ? (
                  <FormattedMessage
                    id="xpack.crossClusterReplication.followerIndexForm.requestFlyout.namedTitle"
                    defaultMessage="Request for {name}"
                    values={{ name }}
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.crossClusterReplication.followerIndexForm.requestFlyout.unnamedTitle"
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
                  id="xpack.crossClusterReplication.followerIndexForm.requestFlyout.descriptionText"
                  defaultMessage="This Elasticsearch request will create this follower index."
                />
              </p>
            </EuiText>

            <EuiSpacer />

            <EuiCodeBlock
              language="json"
              isCopyable
            >
              {request}
            </EuiCodeBlock>
          </EuiFlyoutBody>
        </EuiFlyout>
      </EuiPortal>
    );
  }
}
