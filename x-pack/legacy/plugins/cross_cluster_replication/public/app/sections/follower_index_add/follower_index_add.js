/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n/react';
import chrome from 'ui/chrome';
import { MANAGEMENT_BREADCRUMB } from 'ui/management';

import { EuiPageContent } from '@elastic/eui';

import { listBreadcrumb, addBreadcrumb } from '../../services/breadcrumbs';
import {
  FollowerIndexForm,
  FollowerIndexPageTitle,
  RemoteClustersProvider,
  SectionLoading,
} from '../../components';

export class FollowerIndexAdd extends PureComponent {
  static propTypes = {
    saveFollowerIndex: PropTypes.func.isRequired,
    clearApiError: PropTypes.func.isRequired,
    apiError: PropTypes.object,
    apiStatus: PropTypes.string.isRequired,
  };

  componentDidMount() {
    chrome.breadcrumbs.set([MANAGEMENT_BREADCRUMB, listBreadcrumb, addBreadcrumb]);
  }

  componentWillUnmount() {
    this.props.clearApiError();
  }

  render() {
    const {
      saveFollowerIndex,
      clearApiError,
      apiStatus,
      apiError,
      match: { url: currentUrl },
    } = this.props;

    return (
      <EuiPageContent horizontalPosition="center" className="ccrPageContent">
        <FollowerIndexPageTitle
          title={
            <FormattedMessage
              id="xpack.crossClusterReplication.followerIndex.addTitle"
              defaultMessage="Add follower index"
            />
          }
        />

        <RemoteClustersProvider>
          {({ isLoading, error, remoteClusters }) => {
            if (isLoading) {
              return (
                <SectionLoading dataTestSubj="remoteClustersLoading">
                  <FormattedMessage
                    id="xpack.crossClusterReplication.followerIndexCreateForm.loadingRemoteClustersMessage"
                    defaultMessage="Loading remote clusters…"
                  />
                </SectionLoading>
              );
            }

            return (
              <FollowerIndexForm
                apiStatus={apiStatus}
                apiError={apiError}
                currentUrl={currentUrl}
                remoteClusters={error ? [] : remoteClusters}
                saveFollowerIndex={saveFollowerIndex}
                clearApiError={clearApiError}
                saveButtonLabel={
                  <FormattedMessage
                    id="xpack.crossClusterReplication.followerIndexCreateForm.saveButtonLabel"
                    defaultMessage="Create"
                  />
                }
              />
            );
          }}
        </RemoteClustersProvider>
      </EuiPageContent>
    );
  }
}
