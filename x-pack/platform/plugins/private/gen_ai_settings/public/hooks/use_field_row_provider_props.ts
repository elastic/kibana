/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from './use_kibana';

export const useFieldRowProviderProps = () => {
  const {
    services: { settings, notifications, docLinks },
  } = useKibana();

  return {
    links: docLinks.links.management,
    showDanger: (message: string) => notifications.toasts.addDanger(message),
    validateChange: (key: string, value: unknown) => settings.client.validateValue(key, value),
  };
};
