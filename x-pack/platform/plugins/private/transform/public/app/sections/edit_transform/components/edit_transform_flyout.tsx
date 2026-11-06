/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useEffect, useState } from 'react';

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
import { EditTransformProjectScopeFlyout } from './edit_transform_project_scope_flyout';
import type { LoadedTransformProjectScopeProjects } from './edit_transform_project_scope';
import { EditTransformUpdateButton } from './edit_transform_update_button';

export const EditTransformFlyout: FC<EditAction> = ({
  closeFlyout,
  config,
  dataViewId,
  isFlyoutVisible,
}) => {
  const [projectScopeProjects, setProjectScopeProjects] =
    useState<LoadedTransformProjectScopeProjects | null>(null);
  const isProjectScopeFlyoutVisible = projectScopeProjects !== null;

  useEffect(() => {
    if (!isFlyoutVisible) {
      setProjectScopeProjects(null);
    }
  }, [isFlyoutVisible]);

  const closeEditFlyout = () => {
    setProjectScopeProjects(null);
    closeFlyout();
  };

  if (!config || !isFlyoutVisible) {
    return null;
  }

  return (
    <EditTransformFlyoutProvider config={config} dataViewId={dataViewId}>
      <EuiFlyout
        onClose={closeEditFlyout}
        hideCloseButton
        aria-labelledby={
          isProjectScopeFlyoutVisible
            ? 'transformEditProjectScopeFlyoutTitle'
            : 'transformEditFlyoutTitle'
        }
        data-test-subj="transformEditFlyout"
        size="m"
      >
        {isProjectScopeFlyoutVisible ? (
          <EditTransformProjectScopeFlyout
            onClose={() => setProjectScopeProjects(null)}
            projects={projectScopeProjects}
          />
        ) : (
          <>
            <EuiFlyoutHeader hasBorder>
              <EuiTitle size="s">
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
            <EuiFlyoutBody
              banner={
                <>
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
                  <EditTransformFlyoutCallout />
                </>
              }
            >
              <EditTransformFlyoutForm onOpenProjectScope={setProjectScopeProjects} />
              <EditTransformApiErrorCallout />
            </EuiFlyoutBody>
            <EuiFlyoutFooter>
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty iconType="cross" onClick={closeEditFlyout} flush="left">
                    {i18n.translate('xpack.transform.transformList.editFlyoutCancelButtonText', {
                      defaultMessage: 'Cancel',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EditTransformUpdateButton closeFlyout={closeEditFlyout} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlyoutFooter>
          </>
        )}
      </EuiFlyout>
    </EditTransformFlyoutProvider>
  );
};
