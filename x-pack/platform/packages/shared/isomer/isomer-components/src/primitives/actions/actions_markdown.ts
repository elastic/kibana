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

export const actionsMarkdownRenderer = ({ buttons }: ActionsNode) =>
  md.paragraph(
    ...buttons.flatMap(({ label, url }, index) => [
      ...(index > 0 ? [SEPARATOR] : []),
      md.link(oneLine(label), url),
    ])
  );
