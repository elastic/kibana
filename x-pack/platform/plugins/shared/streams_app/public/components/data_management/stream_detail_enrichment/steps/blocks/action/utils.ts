/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { StreamlangProcessorDefinitionWithUIAttributes } from '@kbn/streamlang';

export const getStepDescription = (step: StreamlangProcessorDefinitionWithUIAttributes) => {
  if ('action' in step) {
    if (step.action === 'grok') {
      return step.patterns.join(' • ');
    } else if (step.action === 'dissect') {
      return step.pattern;
    } else if (step.action === 'date') {
      return `${step.from} • ${step.formats.join(' - ')}`;
    } else if (step.action === 'set') {
      return i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.setProcessorDescription',
        {
          defaultMessage: 'Sets value of "{field}" to "{value}"',
          values: {
            field: step.to,
            value: JSON.stringify(step.value),
          },
        }
      );
    } else if (step.action === 'rename') {
      return i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.renameProcessorDescription',
        {
          defaultMessage: 'Renames "{field}" to "{newField}"',
          values: {
            field: step.from,
            newField: step.to,
          },
        }
      );
    } else if (step.action === 'append') {
      return i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.appendProcessorDescription',
        {
          defaultMessage: 'Appends "{value}" to "{field}"',
          values: {
            field: step.to,
            value: JSON.stringify(step.value),
          },
        }
      );
    } else {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { action, parentId, customIdentifier, where, ignore_failure, ...rest } = step;
      return JSON.stringify(rest);
    }
  }

  return '';
};
