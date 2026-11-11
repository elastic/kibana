/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { md } from '@elastic/isomer-sdk/markdown';
import type { ActionsNode } from './actions';
import { oneLine } from '../../lib';

const SEPARATOR = ' · ';

/** The buttons with a `url` as links; app buttons need a host to resolve them. */
export const actionsMarkdownRenderer = ({ buttons }: ActionsNode) => {
  const links = buttons.flatMap(({ label, url }) => (url ? [md.link(oneLine(label), url)] : []));

  return links.length > 0
    ? md.paragraph(...links.flatMap((link, index) => [...(index > 0 ? [SEPARATOR] : []), link]))
    : [];
};
