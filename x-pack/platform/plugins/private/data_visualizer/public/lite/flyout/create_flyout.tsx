/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { takeUntil, distinctUntilChanged, skip } from 'rxjs';
import { from } from 'rxjs';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { FileUploadLiteFlyoutContents } from './flyout';
import type { OpenFileUploadLiteContext } from '../../register_ui_actions';
// import { getMlGlobalServices } from '../../../application/util/get_services';

export interface FileUploadResults {
  index: string;
  pipelineId?: string;
  dataView?: { id: string; title: string };
  inferenceId?: string;
  files: Array<{ fileName: string; docCount: number; fileFormat: string; documentType: string }>;
}

export interface FlyoutComponentProps {
  setUploadResults?: (results: FileUploadResults) => void;
  onClose?: () => void;
}

export function createFlyout(
  coreStart: CoreStart,
  share: SharePluginStart,
  data: DataPublicPluginStart,
  props: OpenFileUploadLiteContext
): Promise<void> {
  const {
    http,
    overlays,
    application: { currentAppId$ },
    ...startServices
  } = coreStart;

  return new Promise(async (resolve, reject) => {
    try {
      let results: FileUploadResults | null = null;
      const { onUploadComplete, autoAddSemanticTextField } = props;
      try {
        const onFlyoutClose = () => {
          flyoutSession.close();
          if (results !== null && typeof onUploadComplete === 'function') {
            onUploadComplete(results);
          }
          resolve();
        };
        const flyoutSession = overlays.openFlyout(
          toMountPoint(
            <KibanaContextProvider
              services={{
                ...coreStart,
                share,
                data,
                // mlServices: getMlGlobalServices(coreStart, data.dataViews),
              }}
            >
              <FileUploadLiteFlyoutContents
                autoAddSemanticTextField={autoAddSemanticTextField}
                onClose={() => {
                  onFlyoutClose();
                  resolve();
                }}
                setUploadResults={(res) => {
                  if (res) {
                    results = res;
                  }
                }}
              />
            </KibanaContextProvider>,
            startServices
          ),
          {
            'data-test-subj': 'mlFlyoutLayerSelector',
            ownFocus: true,
            onClose: onFlyoutClose,
            size: 's',
          }
        );

        // Close the flyout when user navigates out of the current plugin
        currentAppId$
          .pipe(skip(1), takeUntil(from(flyoutSession.onClose)), distinctUntilChanged())
          .subscribe(() => {
            flyoutSession.close();
          });
      } catch (error) {
        reject(error);
      }
    } catch (error) {
      reject(error);
    }
  });
}
