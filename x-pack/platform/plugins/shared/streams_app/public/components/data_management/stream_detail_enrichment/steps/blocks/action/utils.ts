/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangProcessorDefinitionWithUIAttributes } from '@kbn/streamlang';

export const getStepDescription = (step: StreamlangProcessorDefinitionWithUIAttributes) => {
  if ('action' in step) {
    if (step.action === 'grok') {
      return step.patterns.join(' • ');
    } else if (step.action === 'dissect') {
      return step.pattern;
    } else if (step.action === 'date') {
      return `${step.from} • ${step.formats.join(' - ')}`;
    }
  }

  return '';
};
