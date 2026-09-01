/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from './use_kibana';
import { INFERENCE_UI_CAPABILITIES } from '../../common/constants';

export const useInferenceCapabilities = () => {
  const {
    services: { application },
  } = useKibana();

  const capabilities = application?.capabilities?.searchInferenceEndpoints ?? {};

  return {
    canManage: capabilities[INFERENCE_UI_CAPABILITIES.manage] === true,
  };
};
