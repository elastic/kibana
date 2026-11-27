/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { md, type MarkdownInlineInput } from '@elastic/isomer-sdk/markdown';
import type { ActionsNode } from './actions';
import { oneLine } from '../../lib';

const SEPARATOR = ' · ';

/** The fallback of a node with event buttons, which is how the reader answers without them. */
export const eventFallback = ({ buttons, fallback }: Pick<ActionsNode, 'buttons' | 'fallback'>) =>
  fallback && buttons.some(({ event }) => event) ? [oneLine(fallback)] : [];

/**
 * The buttons with a `url` as links and event buttons as their labels, then the fallback; app
 * buttons need a host to resolve them.
 */
export const actionsMarkdownRenderer = ({ buttons, fallback }: ActionsNode) => {
  const links = buttons.flatMap(({ label, url, event }): MarkdownInlineInput[] => {
    if (event) {
      return [oneLine(label)];
    }
    return url ? [md.link(oneLine(label), url)] : [];
  });

  return [
    ...(links.length > 0
      ? [md.paragraph(...links.flatMap((link, index) => [...(index > 0 ? [SEPARATOR] : []), link]))]
      : []),
    ...eventFallback({ buttons, fallback }).map((text) => md.paragraph(text)),
  ];
};
