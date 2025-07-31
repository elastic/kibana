/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import { OnechatServicesContext } from '../context/onechat_services_context';

export const useOnechatServices = () => {
  const services = useContext(OnechatServicesContext);
  if (services === undefined) {
    throw new Error(
      `OnechatServicesContext not set. Did you wrap your component in <OnechatServicesContext.Provider> ?`
    );
  }
  return services;
};
