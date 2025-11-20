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
      if (step.copy_from) {
        return i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.setFromProcessorDescription',
          {
            defaultMessage: 'Sets value of "{field}" to value of "{copyFromField}"',
            values: {
              field: step.to,
              copyFromField: step.copy_from,
            },
          }
        );
      }
      return i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.setProcessorDescription',
        {
          defaultMessage: 'Sets value of "{field}" to {value}',
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
          defaultMessage: 'Appends {value} to "{field}"',
          values: {
            field: step.to,
            value: JSON.stringify(step.value),
          },
        }
      );
    } else if (step.action === 'convert') {
      if (step.to) {
        return i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.convertProcessorDescriptionWithTo',
          {
            defaultMessage:
              'Converts "{field}" field value to "{type}" type and stores it in "{to}" field',
            values: {
              field: step.from,
              type: step.type,
              to: step.to,
            },
          }
        );
      } else {
        return i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.convertProcessorDescription',
          {
            defaultMessage: 'Converts "{field}" field value to "{type}" type',
            values: {
              field: step.from,
              type: step.type,
            },
          }
        );
      }
    } else if (step.action === 'remove_by_prefix') {
      return i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.removeByPrefixProcessorDescription',
        {
          defaultMessage: 'Removes {field} and all nested fields',
          values: {
            field: step.from,
          },
        }
      );
    } else if (step.action === 'remove') {
      return i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.removeProcessorDescription',
        {
          defaultMessage: 'Removes {field}',
          values: {
            field: step.from,
          },
        }
      );
    } else {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { action, parentId, customIdentifier, ignore_failure, ...rest } = step;
      // Remove 'where' if it exists (some processors have it, some don't)
      const { where, ...restWithoutWhere } = rest;
      return JSON.stringify(restWithoutWhere);
    }
  }

  return '';
};
