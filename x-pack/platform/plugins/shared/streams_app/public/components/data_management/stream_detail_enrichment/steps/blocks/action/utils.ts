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
    if (step.description) {
      return step.description;
    }

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
    } else if (step.action === 'uppercase') {
      return i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.uppercaseProcessorDescription',
        {
          defaultMessage: 'Uppercases the value of "{from}"',
          values: {
            from: step.from,
          },
        }
      );
    } else if (step.action === 'lowercase') {
      return i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.lowercaseProcessorDescription',
        {
          defaultMessage: 'Lowercases the value of "{from}"',
          values: {
            from: step.from,
          },
        }
      );
    } else if (step.action === 'trim') {
      return i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.trimProcessorDescription',
        {
          defaultMessage: 'Trims whitespace from "{from}"',
          values: {
            from: step.from,
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
    } else if (step.action === 'math') {
      return i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.mathProcessorDescription',
        {
          defaultMessage: '{to} = {expression}',
          values: {
            to: step.to,
            expression: step.expression,
          },
        }
      );
    } else if (step.action === 'concat') {
      const fromLength = step.from.length;
      const isPlural = fromLength !== 1;

      const singularConcatDescription = i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.concatProcessorDescriptionSingular',
        {
          defaultMessage: 'Concatenates {fromLength} value.',
          values: {
            fromLength,
          },
        }
      );

      const pluralConcatDescription = i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.concatProcessorDescriptionPlural',
        {
          defaultMessage: 'Concatenates {fromLength} values.',
          values: {
            fromLength,
          },
        }
      );

      return isPlural ? pluralConcatDescription : singularConcatDescription;
    } else if (step.action === 'join') {
      return i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.joinProcessorDescription',
        {
          defaultMessage: 'Combines {fromLength} field(s) with "{delimiter}"',
          values: {
            fromLength: step.from.length,
            delimiter: step.delimiter,
          },
        }
      );
    } else {
      const { action, parentId, customIdentifier, ignore_failure, ...rest } = step;
      // Remove 'where' if it exists (some processors have it, some don't)
      const { where, ...restWithoutWhere } = rest;
      return JSON.stringify(restWithoutWhere);
    }
  }

  return '';
};
