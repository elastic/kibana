/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { useCallback, useState } from 'react';
// import {
//   PerformInstallResponse,
//   UninstallResponse,
// } from '@kbn/product-doc-base-plugin/common/http_api/installation';
import { useKibana } from './use_kibana';

export interface UseKnowledgeBaseResult {
  isInstalling: boolean;
  isUninstalling: boolean;
  installProductDoc: (inferenceId: string) => Promise<void>;
  uninstallProductDoc: (inferenceId: string) => Promise<void>;
}

export function useProductDoc(): UseKnowledgeBaseResult {
  const { notifications, productDocBase } = useKibana().services;
  const [isInstalling, setIsInstalling] = useState(false);
  const [isUninstalling, setIsUninstalling] = useState(false);

  const installProductDoc = useCallback(
    async (inferenceId: string) => {
      if (!productDocBase) {
        throw new Error(
          i18n.translate('xpack.aiAssistant.productDocBaseNotAvailable', {
            defaultMessage: 'Product Doc Base is not available',
          })
        );
      }
      setIsInstalling(true);
      try {
        await productDocBase!.installation.install({ inferenceId });
        notifications!.toasts.addSuccess(
          i18n.translate('xpack.aiAssistant.installProductDoc.successNotification', {
            defaultMessage: 'The Elastic documentation was successfully installed',
          })
        );
      } catch (error) {
        notifications!.toasts.addError(error, {
          title: i18n.translate('xpack.aiAssistant.installProductDoc.errorNotification', {
            defaultMessage: 'Something went wrong while installing the Elastic documentation',
          }),
        });
      } finally {
        setIsInstalling(false);
      }
    },
    [productDocBase, notifications]
  );

  const uninstallProductDoc = useCallback(
    async (inferenceId: string) => {
      if (!productDocBase) {
        throw new Error(
          i18n.translate('xpack.aiAssistant.productDocBaseNotAvailable', {
            defaultMessage: 'Product Doc Base is not available',
          })
        );
      }
      setIsUninstalling(true);
      try {
        await productDocBase!.installation.uninstall({ inferenceId });
        notifications!.toasts.addSuccess(
          i18n.translate('xpack.aiAssistant.uninstallProductDoc.successNotification', {
            defaultMessage: 'The Elastic documentation was successfully uninstalled',
          })
        );
      } catch (error) {
        notifications!.toasts.addError(error, {
          title: i18n.translate('xpack.aiAssistant.uninstallProductDoc.errorNotification', {
            defaultMessage: 'Something went wrong while uninstalling the Elastic documentation',
          }),
        });
      } finally {
        setIsUninstalling(false);
      }
    },
    [productDocBase, notifications]
  );

  return {
    isInstalling,
    isUninstalling,
    installProductDoc,
    uninstallProductDoc,
  };
}
