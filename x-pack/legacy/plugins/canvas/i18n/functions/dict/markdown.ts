/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { markdown } from '../../../canvas_plugin_src/functions/browser/markdown';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { MARKDOWN, CSS } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof markdown>> = {
  help: i18n.translate('xpack.canvas.functions.markdownHelpText', {
    defaultMessage:
      'Adds an element that renders {MARKDOWN} text. TIP: Use the {markdownFn} function for single numbers, metrics, and paragraphs of text.',
    values: {
      MARKDOWN,
      markdownFn: '`markdown`',
    },
  }),
  args: {
    content: i18n.translate('xpack.canvas.functions.markdown.args.contentHelpText', {
      defaultMessage:
        'A string of text that contains {MARKDOWN}. To concatenate, pass the {stringFn} function multiple times.',
      values: {
        MARKDOWN,
        stringFn: '`string`',
      },
    }),
    font: i18n.translate('xpack.canvas.functions.markdown.args.fontHelpText', {
      defaultMessage:
        'The {CSS} font properties for the content. For example, {fontFamily} or {fontWeight}.',
      values: {
        CSS,
        fontFamily: 'font-family',
        fontWeight: 'font-weight',
      },
    }),
    openLinksInNewTab: i18n.translate('xpack.canvas.functions.markdown.args.openLinkHelpText', {
      defaultMessage:
        'A true/false value for opening links in a new tab. Default value is false. Setting to true will open all links in a new tab.',
    }),
  },
};
