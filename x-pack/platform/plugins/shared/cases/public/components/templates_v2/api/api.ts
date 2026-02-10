/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_TEMPLATES_URL } from '../../../../common/constants';
import { KibanaServices } from '../../../common/lib/kibana';
import type { CreateTemplateInput, Template } from '../../../../common/types/domain';

export const postTemplate = async ({
  template,
  signal,
}: {
  template: CreateTemplateInput;
  signal?: AbortSignal;
}): Promise<Template> => {
  const response = await KibanaServices.get().http.fetch<Template>(INTERNAL_TEMPLATES_URL, {
    method: 'POST',
    body: JSON.stringify(template),
    signal,
  });
  return response;
};
