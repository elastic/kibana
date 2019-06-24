/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import chrome from 'ui/chrome';
import { MANAGEMENT_BREADCRUMB } from 'ui/management';

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageContent,
  EuiSpacer,
} from '@elastic/eui';

import { listBreadcrumb, editBreadcrumb } from '../../services/breadcrumbs';
import routing from '../../services/routing';
import {
  AutoFollowPatternForm,
  AutoFollowPatternPageTitle,
  RemoteClustersProvider,
  SectionLoading,
  SectionError,
} from '../../components';
import { API_STATUS } from '../../constants';

export class AutoFollowPatternEdit extends PureComponent {
  static propTypes = {
    getAutoFollowPattern: PropTypes.func.isRequired,
    selectAutoFollowPattern: PropTypes.func.isRequired,
    saveAutoFollowPattern: PropTypes.func.isRequired,
    clearApiError: PropTypes.func.isRequired,
    apiError: PropTypes.object.isRequired,
    apiStatus: PropTypes.object.isRequired,
    autoFollowPattern: PropTypes.object,
    autoFollowPatternId: PropTypes.string,
  }

  static getDerivedStateFromProps({ autoFollowPatternId }, { lastAutoFollowPatternId }) {
    if (lastAutoFollowPatternId !== autoFollowPatternId) {
      return { lastAutoFollowPatternId: autoFollowPatternId };
    }
    return null;
  }

  state = { lastAutoFollowPatternId: undefined }

  componentDidMount() {
    const { match: { params: { id } }, selectAutoFollowPattern } = this.props;
    const decodedId = decodeURIComponent(id);

    selectAutoFollowPattern(decodedId);

    chrome.breadcrumbs.set([ MANAGEMENT_BREADCRUMB, listBreadcrumb, editBreadcrumb ]);
  }

  componentDidUpdate(prevProps, prevState) {
    const { autoFollowPattern, getAutoFollowPattern } = this.props;
    // Fetch the auto-follow pattern on the server if we don't have it (i.e. page reload)
    if (!autoFollowPattern && prevState.lastAutoFollowPatternId !== this.state.lastAutoFollowPatternId) {
      getAutoFollowPattern(this.state.lastAutoFollowPatternId);
    }
  }

  componentWillUnmount() {
    this.props.clearApiError();
  }

  renderGetAutoFollowPatternError(error) {
    const { match: { params: { id: name } } } = this.props;
    const title = i18n.translate(
      'xpack.crossClusterReplication.autoFollowPatternEditForm.loadingErrorTitle',
      {
        defaultMessage: 'Error loading auto-follow pattern'
      }
    );
    const errorMessage = error.status === 404 ? {
      data: {
        error: i18n.translate(
          'xpack.crossClusterReplication.autoFollowPatternEditForm.loadingErrorMessage',
          {
            defaultMessage: `The auto-follow pattern '{name}' does not exist.`,
            values: { name }
          }
        )
      }
    } : error;

    return (
      <Fragment>
        <SectionError title={title} error={errorMessage} />

        <EuiSpacer size="m" />

        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              {...routing.getRouterLinkProps('/auto_follow_patterns')}
              iconType="arrowLeft"
              flush="left"
              data-test-subj="viewAutoFollowPatternListButton"
            >
              <FormattedMessage
                id="xpack.crossClusterReplication.autoFollowPatternEditForm.viewAutoFollowPatternsButtonLabel"
                defaultMessage="View auto-follow patterns"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    );
  }

  renderLoadingAutoFollowPattern() {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.crossClusterReplication.autoFollowPatternEditForm.loadingTitle"
          defaultMessage="Loading auto-follow pattern…"
        />
      </SectionLoading>
    );
  }

  render() {
    const { saveAutoFollowPattern, apiStatus, apiError, autoFollowPattern, match: { url: currentUrl }  } = this.props;

    return (
      <EuiPageContent
        horizontalPosition="center"
        className="ccrPageContent"
      >
        <AutoFollowPatternPageTitle
          title={(
            <FormattedMessage
              id="xpack.crossClusterReplication.autoFollowPattern.editTitle"
              defaultMessage="Edit auto-follow pattern"
            />
          )}
        />

        {apiStatus.get === API_STATUS.LOADING && this.renderLoadingAutoFollowPattern()}


        {apiError.get && this.renderGetAutoFollowPatternError(apiError.get)}

        {autoFollowPattern && (
          <RemoteClustersProvider>
            {({ isLoading, error, remoteClusters }) => {
              if (isLoading) {
                return (
                  <SectionLoading>
                    <FormattedMessage
                      id="xpack.crossClusterReplication.autoFollowPatternEditForm.loadingRemoteClustersMessage"
                      defaultMessage="Loading remote clusters…"
                    />
                  </SectionLoading>
                );
              }

              return (
                <AutoFollowPatternForm
                  apiStatus={apiStatus.save}
                  apiError={apiError.save}
                  currentUrl={currentUrl}
                  remoteClusters={error ? [] : remoteClusters}
                  autoFollowPattern={autoFollowPattern}
                  saveAutoFollowPattern={saveAutoFollowPattern}
                  saveButtonLabel={(
                    <FormattedMessage
                      id="xpack.crossClusterReplication.autoFollowPatternEditForm.saveButtonLabel"
                      defaultMessage="Update"
                    />
                  )}
                />
              );
            }}
          </RemoteClustersProvider>
        )}
      </EuiPageContent>
    );
  }
}
