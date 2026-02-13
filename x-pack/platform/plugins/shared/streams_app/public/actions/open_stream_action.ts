/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import { OPEN_STREAM_ACTION_ID } from '../../common/embeddable';
import type { StreamsAppLocator } from '../../common/locators';
import type { StreamMetricsActionContext } from './stream_metrics_action_context';

export function createOpenStreamAction(
  coreStart: CoreStart,
  locator: StreamsAppLocator
): UiActionsActionDefinition<StreamMetricsActionContext> {
  return {
    id: OPEN_STREAM_ACTION_ID,
    type: OPEN_STREAM_ACTION_ID,
    order: 100,
    getIconType: () => 'popout',
    getDisplayName: () =>
      i18n.translate('xpack.streams.streamMetricsEmbeddable.openStreamAction.displayName', {
        defaultMessage: 'Open in Streams',
      }),
    async getHref(context): Promise<string | undefined> {
      const { isStreamMetricsEmbeddableContext } = await import('./stream_metrics_action_context');
      if (!isStreamMetricsEmbeddableContext(context)) {
        throw new IncompatibleActionError();
      }

      const streamName = context.embeddable.streamName$?.getValue();
      if (!streamName) {
        return undefined;
      }

      return locator.getUrl({ name: streamName });
    },
    async execute(context) {
      const { isStreamMetricsEmbeddableContext } = await import('./stream_metrics_action_context');
      if (!isStreamMetricsEmbeddableContext(context)) {
        throw new IncompatibleActionError();
      }

      const url = await this.getHref!(context);
      if (url) {
        await coreStart.application.navigateToUrl(url);
      }
    },
    async isCompatible(context) {
      const { isStreamMetricsEmbeddableContext } = await import('./stream_metrics_action_context');
      if (!isStreamMetricsEmbeddableContext(context)) {
        return false;
      }

      const streamName = context.embeddable.streamName$?.getValue();
      return Boolean(streamName);
    },
  };
}
