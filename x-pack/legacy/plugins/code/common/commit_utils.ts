/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { i18n } from '@kbn/i18n';

const commitDateFormats: { [key: string]: string } = {
  en: 'MMM Do, YYYY',
  'zh-cn': 'YYYY年Mo月Do日',
};

export const formatCommitDate: (date: Date | string) => string = date => {
  const locale = i18n.getLocale();
  const format = commitDateFormats[locale] || commitDateFormats.en;

  return moment(date).format(format);
};

const parseCommitMessage: (message: string) => { summary: string; body: string } = message => {
  const [summary, ...rest] = message.split('\n');
  const body = rest.join('\n').trim();

  return { summary, body };
};

export { parseCommitMessage };
