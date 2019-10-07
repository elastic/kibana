/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, memo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KibanaObjectUi } from '../page';

export interface KibanaObjectItemProps {
  objectType: string;
  kibanaObjects: KibanaObjectUi[];
  isSaving: boolean;
}

export const KibanaObjects: FC<KibanaObjectItemProps> = memo(
  ({ objectType, kibanaObjects, isSaving }) => {
    const kibanaObjectLabels: { [key: string]: string } = {
      dashboard: i18n.translate('xpack.ml.newJob.simple.recognize.dashboardsLabel', {
        defaultMessage: 'Dashboards',
      }),
      search: i18n.translate('xpack.ml.newJob.simple.recognize.searchesLabel', {
        defaultMessage: 'Searches',
      }),
      visualization: i18n.translate('xpack.ml.newJob.simple.recognize.visualizationsLabel', {
        defaultMessage: 'Visualizations',
      }),
    };

    return (
      <>
        <EuiTitle size="s">
          <h4>{kibanaObjectLabels[objectType]}</h4>
        </EuiTitle>
        <ul>
          {kibanaObjects.map(({ id, title, success, exists }) => (
            <li key={id}>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  {isSaving ? <EuiLoadingSpinner size="m" /> : null}
                  {success !== undefined ? (
                    <EuiIcon
                      type={success ? 'check' : 'cross'}
                      color={success ? 'success' : 'danger'}
                    />
                  ) : null}
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s" color="secondary">
                    {title}
                  </EuiText>
                  {exists && (
                    <EuiText size="xs" color="danger">
                      <FormattedMessage
                        id="xpack.ml.newJob.simple.recognize.alreadyExistsLabel"
                        defaultMessage="(already exists)"
                      />
                    </EuiText>
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            </li>
          ))}
        </ul>
      </>
    );
  }
);
