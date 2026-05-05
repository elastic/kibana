/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PureComponent } from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPageSection } from '@elastic/eui';

import type { ApiStatus } from '../../../../common/types';
import { listBreadcrumb, addBreadcrumb, setBreadcrumbs } from '../../services/breadcrumbs';
import type { AutoFollowPatternCreateConfig } from '../../services/api';
import type { CcrApiError } from '../../services/http_error';
import {
  AutoFollowPatternForm,
  AutoFollowPatternPageTitle,
  RemoteClustersProvider,
} from '../../components';
import { SectionLoading } from '../../../shared_imports';

export interface AutoFollowPatternAddProps extends RouteComponentProps {
  createAutoFollowPattern: (id: string, autoFollowPattern: AutoFollowPatternCreateConfig) => void;
  clearApiError: () => void;
  apiError: CcrApiError | null;
  apiStatus: ApiStatus;
}

export class AutoFollowPatternAdd extends PureComponent<AutoFollowPatternAddProps> {
  componentDidMount() {
    setBreadcrumbs([listBreadcrumb('/auto_follow_patterns'), addBreadcrumb]);
  }

  componentWillUnmount() {
    this.props.clearApiError();
  }

  render() {
    const {
      createAutoFollowPattern,
      apiStatus,
      apiError,
      match: { url: currentUrl },
    } = this.props;

    return (
      <RemoteClustersProvider>
        {({ isLoading, error, remoteClusters }) => {
          if (isLoading) {
            return (
              <SectionLoading>
                <FormattedMessage
                  id="xpack.crossClusterReplication.autoFollowPatternCreateForm.loadingRemoteClustersMessage"
                  defaultMessage="Loading remote clusters…"
                />
              </SectionLoading>
            );
          }

          return (
            <EuiPageSection restrictWidth style={{ width: '100%' }}>
              <AutoFollowPatternPageTitle
                title={
                  <FormattedMessage
                    id="xpack.crossClusterReplication.autoFollowPattern.addTitle"
                    defaultMessage="Add auto-follow pattern"
                  />
                }
              />

              <AutoFollowPatternForm
                apiStatus={apiStatus}
                apiError={apiError}
                currentUrl={currentUrl}
                remoteClusters={error ? [] : remoteClusters}
                createAutoFollowPattern={createAutoFollowPattern}
                saveButtonLabel={
                  <FormattedMessage
                    id="xpack.crossClusterReplication.autoFollowPatternCreateForm.saveButtonLabel"
                    defaultMessage="Create"
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
