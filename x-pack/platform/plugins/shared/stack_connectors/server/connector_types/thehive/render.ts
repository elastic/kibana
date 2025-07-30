/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExecutorParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import {
  renderMustacheObject,
  renderMustacheString,
} from '@kbn/actions-plugin/server/lib/mustache_renderer';
import type { RenderParameterTemplates } from '@kbn/actions-plugin/server/types';
import { SUB_ACTION } from '../../../common/thehive/constants';

function mapSeverity(severity: string): number {
  switch (severity) {
    case 'low':
      return 1;
    case 'medium':
      return 2;
    case 'high':
      return 3;
    case 'critical':
      return 4;
    default:
      return 2;
  }
}

export const renderParameterTemplates: RenderParameterTemplates<ExecutorParams> = (
  logger,
  params,
  variables
) => {
  if (params?.subAction === SUB_ACTION.PUSH_TO_SERVICE) {
    return renderMustacheObject(logger, params, variables);
  } else {
    return {
      ...params,
      subActionParams: {
        ...renderMustacheObject(logger, params.subActionParams, variables),
        severity:
          params.subActionParams.isRuleSeverity === true
            ? mapSeverity(
                renderMustacheString(logger, '{{context.rule.severity}}', variables, 'json')
              )
            : params.subActionParams.severity,
      },
    };
  }
};
