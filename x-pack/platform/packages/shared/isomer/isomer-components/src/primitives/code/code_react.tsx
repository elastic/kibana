/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import type { Renderers, StyledRenderContext } from '@elastic/isomer-sdk';
import { nodeAnchor } from '@elastic/isomer-sdk';
import { classNames, isomerDistillery } from '@kbn/isomer-theme';

import type { ComponentsPackTypes } from '../../lib';
import type { CodeNode } from './code';
import { CODE_COPY_ENHANCEMENT } from './code_copy';

/** How long the button reads "Copied" after a copy. */
export const COPIED_MS = 2000;

const { handles } = isomerDistillery.createStyleModule(
  'componentsCode',
  ({ css, tokens: { border, color, font, size } }) => ({
    root: css`
      margin: ${size.m} 0;
      padding: ${size.m};
      overflow-x: auto;
      border-radius: ${border.radius.control};
      background: ${color.background.subdued};
      color: ${color.text.paragraph};
      font-family: ${font.family.code};
      font-size: ${font.size.s};
      line-height: ${font.lineHeight.s};
      white-space: pre;
    `,
    frame: css`
      position: relative;
      margin: ${size.m} 0;

      & > pre {
        margin: 0;
      }
    `,
    copy: css`
      position: absolute;
      top: ${size.xs};
      right: ${size.xs};
      padding: ${size.xxs} ${size.s};
      border: ${border.width.thin} solid ${color.border.plain};
      border-radius: ${border.radius.control};
      background: ${color.background.plain};
      color: ${color.text.primary};
      font-size: ${font.size.xs};
      line-height: ${font.lineHeight.xs};
      cursor: pointer;
    `,
  })
);

interface CodeProps {
  node: CodeNode;
  context: StyledRenderContext;
}

const Code = ({ node, context, anchored = true }: CodeProps & { anchored?: boolean }) => (
  <pre
    {...(anchored ? nodeAnchor(context, node) : {})}
    className={classNames(context, handles.root)}
  >
    <code data-language={node.language}>{node.text}</code>
  </pre>
);

const hasClipboard = (): boolean =>
  typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function';

/** A code block with a Copy button, drawn once mounted where the clipboard API exists. */
const CopyableCode = ({ node, context }: CodeProps) => {
  const [canCopy, setCanCopy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => setCanCopy(hasClipboard()), []);
  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = () =>
    navigator.clipboard.writeText(node.text).then(
      () => setCopied(true),
      () => setCopied(false)
    );

  return (
    <div {...nodeAnchor(context, node)} className={classNames(context, handles.frame)}>
      <Code node={node} context={context} anchored={false} />
      {canCopy ? (
        <button
          type="button"
          className={classNames(context, handles.copy)}
          aria-label={node.language ? `Copy ${node.language} code` : 'Copy code'}
          onClick={copy}
        >
          <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      ) : null}
    </div>
  );
};

export const codeReactRenderer: Renderers<CodeNode, ComponentsPackTypes>['react'] = (
  node,
  { context }
) =>
  context.enhancements?.has(CODE_COPY_ENHANCEMENT) ? (
    <CopyableCode node={node} context={context} />
  ) : (
    <Code node={node} context={context} />
  );
