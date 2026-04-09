/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import { TraceWaterfall } from './components/trace_waterfall';
import type {
  EvalsPublicSetup,
  EvalsPublicStart,
  EvalsSetupDependencies,
  EvalsStartDependencies,
} from './types';

const MANAGEMENT_KEYWORDS = ['evals', 'evaluations', 'ai', 'llm', 'trace', 'tracing'] as const;

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

  start(_core: CoreStart, _plugins: EvalsStartDependencies): EvalsPublicStart {
    return { TraceWaterfall };
  }

  stop() {}
}
