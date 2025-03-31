/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLoadingSpinner,
  EuiText,
  type EuiHealthProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MODEL_STATE, type ModelState } from '@kbn/ml-trained-models-utils';
import React from 'react';

export interface NameOverrides {
  downloading?: string;
}

export const getModelStateColor = (
  state: ModelState | undefined,
  nameOverrides?: NameOverrides
): { color: EuiHealthProps['color']; name: string; component?: React.ReactNode } | null => {
  switch (state) {
    case MODEL_STATE.DOWNLOADED:
      return {
        color: 'success',
        name: i18n.translate('xpack.ml.trainedModels.modelsList.modelState.downloadedName', {
          defaultMessage: 'Ready to deploy',
        }),
      };
    case MODEL_STATE.DOWNLOADING:
      return {
        color: 'primary',
        name:
          nameOverrides?.downloading ??
          i18n.translate('xpack.ml.trainedModels.modelsList.modelState.downloadingName', {
            defaultMessage: 'Downloading',
          }),
      };
    case MODEL_STATE.STARTED:
      return {
        color: '#E6F9F7',
        name: i18n.translate('xpack.ml.trainedModels.modelsList.modelState.startedName', {
          defaultMessage: 'Deployed',
        }),
        get component() {
          return (
            <EuiBadge color={this.color}>
              <EuiHealth color={'success'} textSize="xs" css={{ display: 'inline' }}>
                {this.name}
              </EuiHealth>
            </EuiBadge>
          );
        },
      };
    case MODEL_STATE.STARTING:
      return {
        color: 'success',
        name: i18n.translate('xpack.ml.trainedModels.modelsList.modelState.startingName', {
          defaultMessage: 'Deploying',
        }),
        get component() {
          return (
            <EuiFlexGroup gutterSize="xs" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="s" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">{this.name}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      };
    case MODEL_STATE.STOPPING:
      return {
        color: 'accent',
        name: i18n.translate('xpack.ml.trainedModels.modelsList.modelState.stoppingName', {
          defaultMessage: 'Stopping',
        }),
        get component() {
          return (
            <EuiFlexGroup gutterSize="xs" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="s" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">{this.name}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      };
    case MODEL_STATE.NOT_DOWNLOADED:
    default:
      return null;
  }
};
