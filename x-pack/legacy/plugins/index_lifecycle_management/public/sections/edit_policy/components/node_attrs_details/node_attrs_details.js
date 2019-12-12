/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiFlyoutBody,
  EuiFlyout,
  EuiTitle,
  EuiInMemoryTable,
  EuiSpacer,
  EuiPortal,
} from '@elastic/eui';

export class NodeAttrsDetails extends PureComponent {
  static propTypes = {
    fetchNodeDetails: PropTypes.func.isRequired,
    close: PropTypes.func.isRequired,

    details: PropTypes.array,
    selectedNodeAttrs: PropTypes.string.isRequired,
  };

  UNSAFE_componentWillMount() {
    this.props.fetchNodeDetails(this.props.selectedNodeAttrs);
  }

  render() {
    const { selectedNodeAttrs, details, close } = this.props;

    return (
      <EuiPortal>
        <EuiFlyout ownFocus onClose={close}>
          <EuiFlyoutBody>
            <EuiTitle>
              <h2>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.nodeAttrDetails.title"
                  defaultMessage="Nodes that contain the attribute {selectedNodeAttrs}"
                  values={{ selectedNodeAttrs }}
                />
              </h2>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiInMemoryTable
              items={details || []}
              columns={[
                { field: 'nodeId', name: i18n.translate('xpack.indexLifecycleMgmt.nodeAttrDetails.idField', {
                  defaultMessage: 'ID'
                }) },
                { field: 'stats.name', name: i18n.translate('xpack.indexLifecycleMgmt.nodeAttrDetails.nameField', {
                  defaultMessage: 'Name'
                }) },
                { field: 'stats.host', name: i18n.translate('xpack.indexLifecycleMgmt.nodeAttrDetails.hostField', {
                  defaultMessage: 'Host'
                }) },
              ]}
              pagination={true}
              sorting={true}
            />
          </EuiFlyoutBody>
        </EuiFlyout>
      </EuiPortal>
    );
  }
}
