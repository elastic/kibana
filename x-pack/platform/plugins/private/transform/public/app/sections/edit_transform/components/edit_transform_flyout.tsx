/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';

import { isManagedTransform } from '../../../common/managed_transforms_utils';

import { ManagedTransformsWarningCallout } from '../../transform_management/components/managed_transforms_callout/managed_transforms_callout';
import type { EditAction } from '../../transform_management/components/action_edit';

import { EditTransformFlyoutProvider } from '../state_management/edit_transform_flyout_state';

import { EditTransformApiErrorCallout } from './edit_transform_api_error_callout';
import { EditTransformFlyoutCallout } from './edit_transform_flyout_callout';
import { EditTransformFlyoutForm } from './edit_transform_flyout_form';
import { EditTransformUpdateButton } from './edit_transform_update_button';

export const EditTransformFlyout: FC<EditAction> = ({
  closeFlyout,
  config,
  dataViewId,
  isFlyoutVisible,
}) =>
  config && isFlyoutVisible ? (
    <EditTransformFlyoutProvider config={config} dataViewId={dataViewId}>
      <EuiFlyout
        onClose={closeFlyout}
        hideCloseButton
        aria-labelledby="transformEditFlyoutTitle"
        data-test-subj="transformEditFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id="transformEditFlyoutTitle">
              {i18n.translate('xpack.transform.transformList.editFlyoutTitle', {
                defaultMessage: 'Edit {transformId}',
                values: {
                  transformId: config.id,
                },
              })}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        {isManagedTransform({ config }) ? (
          <ManagedTransformsWarningCallout
            count={1}
            action={i18n.translate(
              'xpack.transform.transformList.editManagedTransformsDescription',
              {
                defaultMessage: 'editing',
              }
            )}
          />
        ) : null}
        <EuiFlyoutBody banner={<EditTransformFlyoutCallout />}>
          <EditTransformFlyoutForm />
          <EditTransformApiErrorCallout />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
                {i18n.translate('xpack.transform.transformList.editFlyoutCancelButtonText', {
                  defaultMessage: 'Cancel',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EditTransformUpdateButton closeFlyout={closeFlyout} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </EditTransformFlyoutProvider>
  ) : null;
