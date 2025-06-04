/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import { OneChatServicesContext } from '../context/onechat_services_context';

export const useOneChatServices = () => {
  const services = useContext(OneChatServicesContext);
  if (services === undefined) {
    throw new Error(
      `OneChatServicesContext not set. Did you wrap your component in <OneChatServicesContext.Provider> ?`
    );
  }
  return services;
};
