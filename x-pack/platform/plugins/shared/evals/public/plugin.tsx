/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import React, { Suspense } from 'react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import type {
  AddToDatasetAction,
  AddToDatasetActionConfig,
  AddToDatasetFlyoutOpenOptions,
  EvalsPublicSetup,
  EvalsPublicStart,
  EvalsSetupDependencies,
  EvalsStartDependencies,
} from './types';

const MANAGEMENT_KEYWORDS = ['evals', 'evaluations', 'ai', 'llm', 'trace', 'tracing'] as const;

const DEFAULT_ADD_TO_DATASET_LABEL = i18n.translate('xpack.evals.addToDatasetAction.label', {
  defaultMessage: 'Add to dataset',
});

export class EvalsPublicPlugin
  implements
    Plugin<EvalsPublicSetup, EvalsPublicStart, EvalsSetupDependencies, EvalsStartDependencies>
{
  public setup(
    coreSetup: CoreSetup<EvalsStartDependencies>,
    { management }: EvalsSetupDependencies
  ): EvalsPublicSetup {
    if (management) {
      management.sections.section.ai.registerApp({
        id: PLUGIN_ID,
        title: i18n.translate('xpack.evals.stackManagement.aiNavTitle', {
          defaultMessage: PLUGIN_NAME,
        }),
        order: 2,
        keywords: [...MANAGEMENT_KEYWORDS],
        capabilitiesId: PLUGIN_ID,
        mount: async (mountParams) => {
          const { mountManagementSection } = await import('./management_section/mount_section');
          return mountManagementSection({ core: coreSetup, mountParams });
        },
      });
    }

    return {};
  }

  start(core: CoreStart, _plugins: EvalsStartDependencies): EvalsPublicStart {
    const LazyTraceWaterfall = React.lazy(async () => {
      const mod = await import('./components/trace_waterfall');
      return { default: mod.TraceWaterfall };
    });

    const TraceWaterfall: EvalsPublicStart['TraceWaterfall'] = ({ traceId }) => {
      return (
        <Suspense fallback={null}>
          <LazyTraceWaterfall traceId={traceId} />
        </Suspense>
      );
    };

    const openAddToDatasetFlyout = (options: AddToDatasetFlyoutOpenOptions) => {
      void (async () => {
        const { AddToDatasetFlyout } = await import('./components/add_to_dataset_flyout');
        const overlayRef = core.overlays.openFlyout(
          toMountPoint(
            <AddToDatasetFlyout
              coreStart={core}
              options={options}
              onClose={() => overlayRef.close()}
            />,
            core
          ),
          {
            ownFocus: true,
            size: 'm',
            resizable: true,
            minWidth: 480,
            maxWidth: 920,
          }
        );
      })();
    };

    const getAddToDatasetAction = (config: AddToDatasetActionConfig): AddToDatasetAction => {
      const {
        label = DEFAULT_ADD_TO_DATASET_LABEL,
        ariaLabel = label,
        iconType = 'beaker',
        stopPropagation = false,
        onBeforeOpen,
        ...options
      } = config;

      return {
        label,
        ariaLabel,
        iconType,
        onClick: (event) => {
          if (stopPropagation) event?.stopPropagation?.();
          onBeforeOpen?.();
          openAddToDatasetFlyout(options);
        },
      };
    };

    return { TraceWaterfall, openAddToDatasetFlyout, getAddToDatasetAction };
  }

  stop() {}
}
