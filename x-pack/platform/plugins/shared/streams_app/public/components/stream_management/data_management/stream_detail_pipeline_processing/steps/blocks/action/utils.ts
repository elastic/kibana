/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { GrokPatternField, ProcessorFormState } from '../../../types';

const getPatternValue = (pattern: string | GrokPatternField) =>
  typeof pattern === 'string' ? pattern : pattern.value;

export const getStepDescription = (step: ProcessorFormState) => {
  if (step.description) {
    return step.description;
  }

  switch (step.action) {
    case 'grok':
      return step.patterns.map(getPatternValue).join(' • ');
    case 'dissect':
      return step.pattern;
    case 'date':
      return `${step.field} • ${step.formats.join(' - ')}`;
    case 'set':
      return i18n.translate(
        'xpack.streams.streamDetailView.managementTab.pipelineProcessing.setProcessorDescription',
        {
          defaultMessage: 'Sets "{field}"',
          values: { field: step.field },
        }
      );
    case 'rename':
      return i18n.translate(
        'xpack.streams.streamDetailView.managementTab.pipelineProcessing.renameProcessorDescription',
        {
          defaultMessage: 'Renames "{field}" to "{newField}"',
          values: { field: step.field, newField: step.target_field },
        }
      );
    case 'append':
      return i18n.translate(
        'xpack.streams.streamDetailView.managementTab.pipelineProcessing.appendProcessorDescription',
        {
          defaultMessage: 'Appends to "{field}"',
          values: { field: step.field },
        }
      );
    case 'convert':
      return i18n.translate(
        'xpack.streams.streamDetailView.managementTab.pipelineProcessing.convertProcessorDescription',
        {
          defaultMessage: 'Converts "{field}" to "{type}"',
          values: { field: step.field, type: step.type },
        }
      );
    case 'remove':
      return i18n.translate(
        'xpack.streams.streamDetailView.managementTab.pipelineProcessing.removeProcessorDescription',
        {
          defaultMessage: 'Removes {field}',
          values: { field: Array.isArray(step.field) ? step.field.join(', ') : step.field },
        }
      );
    case 'gsub':
      return i18n.translate(
        'xpack.streams.streamDetailView.managementTab.pipelineProcessing.replaceProcessorDescription',
        {
          defaultMessage: 'Replaces matches in "{field}"',
          values: { field: step.field },
        }
      );
    case 'join':
      return i18n.translate(
        'xpack.streams.streamDetailView.managementTab.pipelineProcessing.joinProcessorDescription',
        {
          defaultMessage: 'Joins values in "{field}" with "{separator}"',
          values: { field: step.field, separator: step.separator },
        }
      );
    case 'network_direction':
      return i18n.translate(
        'xpack.streams.streamDetailView.managementTab.pipelineProcessing.networkDirectionProcessorDescription',
        {
          defaultMessage: 'Network direction from "{source_ip}" to "{destination_ip}".',
          values: { source_ip: step.source_ip, destination_ip: step.destination_ip },
        }
      );
    case 'enrich':
      return i18n.translate(
        'xpack.streams.streamDetailView.managementTab.pipelineProcessing.enrichProcessorDescription',
        {
          defaultMessage: 'Enrich data with the policy "{policy_name}"',
          values: { policy_name: step.policy_name },
        }
      );
    case 'user_agent':
      return i18n.translate(
        'xpack.streams.streamDetailView.managementTab.pipelineProcessing.userAgentProcessorDescription',
        {
          defaultMessage: 'Extracts user agent info from "{field}"',
          values: { field: step.field },
        }
      );
    case 'uri_parts':
      return i18n.translate(
        'xpack.streams.streamDetailView.managementTab.pipelineProcessing.uriPartsProcessorDescription',
        {
          defaultMessage: 'Parses "{field}" into URI components',
          values: { field: step.field },
        }
      );
    case 'registered_domain':
      return i18n.translate(
        'xpack.streams.streamDetailView.managementTab.pipelineProcessing.registeredDomainProcessorDescription',
        {
          defaultMessage: 'Extracts domain parts from "{expression}"',
          values: { expression: step.expression },
        }
      );
    default: {
      const {
        action: _action,
        customIdentifier: _customIdentifier,
        parentId: _parentId,
        ...rest
      } = step;
      return JSON.stringify(rest);
    }
  }
};
