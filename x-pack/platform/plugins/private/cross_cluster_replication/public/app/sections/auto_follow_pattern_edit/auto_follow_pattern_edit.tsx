/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PureComponent } from 'react';
import type { ReactNode } from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiButton, EuiPageSection, EuiPageTemplate } from '@elastic/eui';

import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import type { ApiStatus } from '../../../../common/types';
import type { AutoFollowPatternWithErrors } from '../../store/selectors';
import { listBreadcrumb, editBreadcrumb, setBreadcrumbs } from '../../services/breadcrumbs';
import type { AutoFollowPatternConfig } from '../../services/api';
import {
  AutoFollowPatternForm,
  AutoFollowPatternPageTitle,
  RemoteClustersProvider,
} from '../../components';
import type { CcrApiError } from '../../services/http_error';
import { getErrorBody, getErrorStatus } from '../../services/http_error';
import { API_STATUS } from '../../constants';
import { SectionLoading } from '../../../shared_imports';

export interface AutoFollowPatternEditProps extends RouteComponentProps<{ id: string }> {
  getAutoFollowPattern: (id: string) => void;
  selectAutoFollowPattern: (id: string | null) => void;
  updateAutoFollowPattern: (id: string, autoFollowPattern: AutoFollowPatternConfig) => void;
  clearApiError: () => void;
  apiError: { get: CcrApiError | null; save: CcrApiError | null };
  apiStatus: { get: ApiStatus; save: ApiStatus };
  autoFollowPattern: AutoFollowPatternWithErrors | null;
  autoFollowPatternId: string | null;
}

export interface AutoFollowPatternEditState {
  lastAutoFollowPatternId: string | undefined;
}

export class AutoFollowPatternEdit extends PureComponent<
  AutoFollowPatternEditProps,
  AutoFollowPatternEditState
> {
  static getDerivedStateFromProps(
    { autoFollowPatternId }: Pick<AutoFollowPatternEditProps, 'autoFollowPatternId'>,
    { lastAutoFollowPatternId }: AutoFollowPatternEditState
  ): Partial<AutoFollowPatternEditState> | null {
    if (lastAutoFollowPatternId !== autoFollowPatternId) {
      return { lastAutoFollowPatternId: autoFollowPatternId ?? undefined };
    }
    return null;
  }

  state: AutoFollowPatternEditState = { lastAutoFollowPatternId: undefined };

  componentDidMount() {
    const {
      match: {
        params: { id },
      },
      selectAutoFollowPattern,
    } = this.props;
    const decodedId = decodeURIComponent(id);

    selectAutoFollowPattern(decodedId);

    setBreadcrumbs([listBreadcrumb('/auto_follow_patterns'), editBreadcrumb]);
  }

  componentDidUpdate(prevProps: AutoFollowPatternEditProps, prevState: AutoFollowPatternEditState) {
    const { autoFollowPattern, getAutoFollowPattern } = this.props;
    // Fetch the auto-follow pattern on the server if we don't have it (i.e. page reload)
    if (
      !autoFollowPattern &&
      prevState.lastAutoFollowPatternId !== this.state.lastAutoFollowPatternId
    ) {
      const id = this.state.lastAutoFollowPatternId;
      if (id !== undefined) {
        getAutoFollowPattern(id);
      }
    }
  }

  componentWillUnmount() {
    this.props.clearApiError();
  }

  renderGetAutoFollowPatternError(error: CcrApiError) {
    const {
      match: {
        params: { id: name },
      },
    } = this.props;

    const statusCode = getErrorStatus(error);
    const body = getErrorBody(error);
    const errorMessage: ReactNode =
      statusCode === 404
        ? i18n.translate(
            'xpack.crossClusterReplication.autoFollowPatternEditForm.loadingErrorMessage',
            {
              defaultMessage: `The auto-follow pattern ''{name}'' does not exist.`,
              values: { name },
            }
          )
        : body?.message ?? error.message;

    const listNav = reactRouterNavigate(this.props.history, `/auto_follow_patterns`);

    return (
      <EuiPageTemplate.EmptyPrompt
        color="danger"
        iconType="warning"
        title={
          <h2>
            <FormattedMessage
              id="xpack.crossClusterReplication.autoFollowPatternEditForm.loadingErrorTitle"
              defaultMessage="Error loading auto-follow pattern"
            />
          </h2>
        }
        body={<p>{errorMessage}</p>}
        actions={
          <EuiButton
            href={listNav.href}
            onClick={listNav.onClick}
            color="danger"
            iconType="chevronSingleLeft"
            data-test-subj="viewAutoFollowPatternListButton"
          >
            <FormattedMessage
              id="xpack.crossClusterReplication.autoFollowPatternEditForm.viewAutoFollowPatternsButtonLabel"
              defaultMessage="View auto-follow patterns"
            />
          </EuiButton>
        }
      />
    );
  }

  renderLoading(loadingTitle: ReactNode) {
    return <SectionLoading>{loadingTitle}</SectionLoading>;
  }

  render() {
    const {
      updateAutoFollowPattern,
      apiStatus,
      apiError,
      autoFollowPattern,
      match: { url: currentUrl },
    } = this.props;

    if (apiStatus.get === API_STATUS.LOADING || !autoFollowPattern) {
      return this.renderLoading(
        i18n.translate('xpack.crossClusterReplication.autoFollowPatternEditForm.loadingTitle', {
          defaultMessage: 'Loading auto-follow pattern…',
        })
      );
    }

    if (apiError.get) {
      return this.renderGetAutoFollowPatternError(apiError.get);
    }

    return (
      <RemoteClustersProvider>
        {({ isLoading, error, remoteClusters }) => {
          if (isLoading) {
            return this.renderLoading(
              i18n.translate(
                'xpack.crossClusterReplication.autoFollowPatternEditForm.loadingRemoteClustersMessage',
                { defaultMessage: 'Loading remote clusters…' }
              )
            );
          }

          return (
            <EuiPageSection restrictWidth style={{ width: '100%' }}>
              <AutoFollowPatternPageTitle
                title={
                  <FormattedMessage
                    id="xpack.crossClusterReplication.autoFollowPattern.editTitle"
                    defaultMessage="Edit auto-follow pattern"
                  />
                }
              />

              <AutoFollowPatternForm
                apiStatus={apiStatus.save}
                apiError={apiError.save}
                currentUrl={currentUrl}
                remoteClusters={error ? [] : remoteClusters}
                autoFollowPattern={autoFollowPattern}
                updateAutoFollowPattern={updateAutoFollowPattern}
                saveButtonLabel={
                  <FormattedMessage
                    id="xpack.crossClusterReplication.autoFollowPatternEditForm.saveButtonLabel"
                    defaultMessage="Update"
                  />
                }
              />
            </EuiPageSection>
          );
        }}
      </RemoteClustersProvider>
    );
  }
}
