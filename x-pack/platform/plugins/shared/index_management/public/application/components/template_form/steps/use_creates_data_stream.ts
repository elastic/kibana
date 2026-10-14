/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Forms } from '../../../../shared_imports';
import type { WizardContent } from '../template_form';

export const useCreatesDataStream = (): boolean => {
  const { getSingleContentData } = Forms.useContent<WizardContent, 'components'>('components');
  return getSingleContentData('logistics').dataStream !== undefined;
};
