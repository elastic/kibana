/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import type { DeployGroup } from './deploy_groups';
import {
  applyDedicatedNamespaceTemplates,
  getGlobalNamespacePackages,
} from './apply_dedicated_templates';

interface UseApplyDedicatedTemplatesParams {
  /** Whether the switch is on. */
  enabled: boolean;
  /** Whether every policy of the deploy exists, so the packages are installed. */
  isDeployDone: boolean;
  groups: DeployGroup[];
  globalNamespace: string;
}

/**
 * Opts the global namespace in to dedicated index templates once the deploy is done. It runs on
 * the state, not on a deploy path, so it covers every way a deploy ends, a resume included, and
 * does nothing once the packages already have the namespace.
 */
export const useApplyDedicatedTemplates = ({
  enabled,
  isDeployDone,
  groups,
  globalNamespace,
}: UseApplyDedicatedTemplatesParams): void => {
  const {
    services: { notifications },
  } = useKibana<CoreStart>();
  const lastRequestRef = useRef<string>();

  useEffect(() => {
    if (!enabled || !isDeployDone) return;
    const packageNames = getGlobalNamespacePackages(groups, globalNamespace);
    if (packageNames.length === 0) return;

    const request = `${globalNamespace}|${[...packageNames].sort().join(',')}`;
    if (lastRequestRef.current === request) return;
    lastRequestRef.current = request;

    applyDedicatedNamespaceTemplates(packageNames, globalNamespace).then((failedPackages) => {
      if (failedPackages.length === 0) return;
      // Forget the request so a later change of the settings tries again.
      lastRequestRef.current = undefined;
      notifications.toasts.addWarning({
        title: i18n.translate('xpack.ingestHub.dedicatedNamespaceTemplates.applyErrorTitle', {
          defaultMessage: 'Could not enable dedicated index templates',
        }),
        text: i18n.translate('xpack.ingestHub.dedicatedNamespaceTemplates.applyErrorText', {
          defaultMessage:
            'The "{namespace}" namespace was not updated for: {packages}. You can enable it in the integration settings in Fleet.',
          values: { namespace: globalNamespace, packages: failedPackages.join(', ') },
        }),
      });
    });
  }, [enabled, isDeployDone, groups, globalNamespace, notifications]);
};
