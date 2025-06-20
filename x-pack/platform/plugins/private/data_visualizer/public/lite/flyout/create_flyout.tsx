/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Suspense, lazy } from 'react';
import { takeUntil, distinctUntilChanged, skip } from 'rxjs';
import { from } from 'rxjs';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { CoreStart } from '@kbn/core/public';
import type { FileUploadResults, OpenFileUploadLiteContext } from '@kbn/file-upload-common';
import { EuiFlyoutHeader, EuiSkeletonText, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataVisualizerStartDependencies } from '../../application/common/types/data_visualizer_plugin';

export function createFlyout(
  coreStart: CoreStart,
  plugins: DataVisualizerStartDependencies,
  props: OpenFileUploadLiteContext
) {
  const {
    http,
    overlays,
    application: { currentAppId$ },
    ...startServices
  } = coreStart;

  const LazyFlyoutContents = lazy(async () => {
    const { FileDataVisualizerLite } = await import('../file_upload_lite');
    return {
      default: FileDataVisualizerLite,
    };
  });

  let results: FileUploadResults | null = null;

  const onFlyoutClose = () => {
    flyoutSession.close();
    if (results !== null && typeof props.onUploadComplete === 'function') {
      props.onUploadComplete(results);
    }
  };

  const flyoutSession = overlays.openFlyout(
    toMountPoint(
      <Suspense fallback={<LoadingContents />}>
        <LazyFlyoutContents
          coreStart={coreStart}
          plugins={plugins}
          props={{
            ...props,
            onUploadComplete: (res) => {
              if (res) {
                results = res;
              }
            },
          }}
          onClose={onFlyoutClose}
        />
      </Suspense>,
      startServices
    ),
    {
      'data-test-subj': 'mlFlyoutLayerSelector',
      ownFocus: true,
      onClose: onFlyoutClose,
      size: '500px',
    }
  );

  // Close the flyout when user navigates out of the current plugin
  currentAppId$
    .pipe(skip(1), takeUntil(from(flyoutSession.onClose)), distinctUntilChanged())
    .subscribe(() => {
      flyoutSession.close();
    });
}

const LoadingContents: FC = () => (
  <>
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.dataVisualizer.file.uploadView.uploadFileTitle"
            defaultMessage="Upload a file"
          />
        </h3>
      </EuiTitle>
    </EuiFlyoutHeader>
    <EuiSpacer />
    <EuiSkeletonText />
  </>
);
