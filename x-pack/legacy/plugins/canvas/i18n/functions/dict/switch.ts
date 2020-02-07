/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { switchFn } from '../../../canvas_plugin_src/functions/common/switch';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { CONTEXT } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof switchFn>> = {
  help: i18n.translate('xpack.canvas.functions.switchHelpText', {
    defaultMessage:
      'Performs conditional logic with multiple conditions. ' +
      'See also {caseFn} which builds a {case} to pass to the {switchFn} function.',
    values: {
      case: '`case`',
      caseFn: '`case`',
      switchFn: '`switch`',
    },
  }),
  args: {
    case: i18n.translate('xpack.canvas.functions.switch.args.caseHelpText', {
      defaultMessage: 'The conditions to check',
    }),
    default: i18n.translate('xpack.canvas.functions.switch.args.defaultHelpText', {
      defaultMessage:
        'The value returned when no conditions are met. ' +
        'When unspecified and no conditions are met, the original {CONTEXT} is returned.',
      values: {
        CONTEXT,
      },
    }),
  },
};
