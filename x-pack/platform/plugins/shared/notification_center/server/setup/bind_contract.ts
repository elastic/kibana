/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type KibanaContainerModuleLoadOptions, Setup, Start } from '@kbn/core-di';
import {
  NotificationSubmitService,
  type NotificationSubmitPayload,
  type NotificationTypeTarget,
} from '../lib/submit';
import type {
  NotificationCenterPluginSetup,
  NotificationCenterPluginStart,
  SubmitNotificationResult,
} from '../types';

export const bindContract = ({ bind }: KibanaContainerModuleLoadOptions): void => {
  bind(Setup).toDynamicValue(({ inject }) => {
    // Producers hold on to `submit` from the setup stage, but the write path needs start services;
    // `inject` defers resolving them until the plugin has started.
    const submit = inject<
      SubmitNotificationResult,
      [NotificationTypeTarget, NotificationSubmitPayload],
      [NotificationSubmitService]
    >(NotificationSubmitService, (service, target, input) => service.submit(target, input));

    const contract: NotificationCenterPluginSetup = {
      forType: ({ namespace, type, kind }) => ({
        submit: (input) => submit({ namespace, type, kind }, input),
      }),
    };

    return contract;
  });

  bind(Start).toConstantValue({} satisfies NotificationCenterPluginStart);
};
