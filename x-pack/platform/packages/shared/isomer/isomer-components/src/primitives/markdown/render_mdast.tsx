/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: clintandrewhall - Parse with the SDK once https://github.com/elastic/isomer/issues/220 ships in 0.4.0.
// `react-markdown` is ESM-only, and Kibana's server build can't `require()` it.

import React, { type ReactNode } from 'react';
import type { Definition, List, Nodes, Parents, Root, RootContent, TableRow } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { gfm } from 'micromark-extension-gfm';
import { urlTransform } from './markdown_safety';

/** Parses GitHub-flavored Markdown the way the SDK's `md.authored` does. */
export const parseMarkdown = (markdown: string): Root =>
  fromMarkdown(markdown, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });

type Definitions = ReadonlyMap<string, Definition>;

const isParent = (node: Nodes): node is Parents => 'children' in node;

const collectDefinitions = (node: Nodes, definitions: Map<string, Definition>) => {
  if (node.type === 'definition') {
    definitions.set(node.identifier, node);
  }
  if (isParent(node)) {
    node.children.forEach((child: RootContent) => collectDefinitions(child, definitions));
  }
  return definitions;
};

const isLoose = ({ spread, children }: List): boolean =>
  Boolean(spread) || children.some((item) => item.spread);

interface RenderContext {
  definitions: Definitions;
  /** Paragraphs in a tight list item render without `<p>`. */
  tight: boolean;
}

const renderChildren = (parent: Parents, context: RenderContext): ReactNode[] =>
  parent.children.map((child: RootContent, index) => (
    <React.Fragment key={index}>{renderNode(child, context)}</React.Fragment>
  ));

const renderLink = (href: string, title: string | null | undefined, children: ReactNode) => {
  const safeHref = urlTransform(href, 'href');
  return safeHref ? (
    <a href={safeHref} title={title ?? undefined}>
      {children}
    </a>
  ) : (
    children
  );
};

const renderImage = (src: string, alt: string | null | undefined, title?: string | null) => {
  const safeSrc = urlTransform(src, 'src');
  return safeSrc ? <img src={safeSrc} alt={alt ?? ''} title={title ?? undefined} /> : null;
};

const renderNode = (node: Nodes, context: RenderContext): ReactNode => {
  const children = () => (isParent(node) ? renderChildren(node, context) : null);

  switch (node.type) {
    case 'root':
      return children();
    case 'paragraph':
      return context.tight ? children() : <p>{children()}</p>;
    case 'heading':
      return React.createElement(`h${node.depth}`, null, children());
    case 'thematicBreak':
      return <hr />;
    case 'blockquote':
      return <blockquote>{renderChildren(node, { ...context, tight: false })}</blockquote>;
    case 'list': {
      const items = renderChildren(node, { ...context, tight: !isLoose(node) });
      return node.ordered ? (
        <ol start={node.start != null && node.start !== 1 ? node.start : undefined}>{items}</ol>
      ) : (
        <ul>{items}</ul>
      );
    }
    case 'listItem':
      return (
        <li>
          {typeof node.checked === 'boolean' && (
            <>
              <input type="checkbox" checked={node.checked} disabled readOnly />{' '}
            </>
          )}
          {renderChildren(node, { ...context, tight: context.tight && !node.spread })}
        </li>
      );
    case 'code':
      return (
        <pre>
          <code className={node.lang ? `language-${node.lang}` : undefined}>{node.value}</code>
        </pre>
      );
    case 'table': {
      const { align } = node;
      const [head, ...body] = node.children;
      const cells = (row: TableRow, Cell: 'th' | 'td') =>
        row.children.map((cell, index) => {
          const textAlign = align?.[index];
          return (
            <Cell key={index} style={textAlign ? { textAlign } : undefined}>
              {renderChildren(cell, context)}
            </Cell>
          );
        });
      return (
        <table>
          {head && (
            <thead>
              <tr>{cells(head, 'th')}</tr>
            </thead>
          )}
          {body.length > 0 && (
            <tbody>
              {body.map((row, index) => (
                <tr key={index}>{cells(row, 'td')}</tr>
              ))}
            </tbody>
          )}
        </table>
      );
    }
    case 'text':
      return node.value;
    case 'emphasis':
      return <em>{children()}</em>;
    case 'strong':
      return <strong>{children()}</strong>;
    case 'delete':
      return <del>{children()}</del>;
    case 'inlineCode':
      return <code>{node.value}</code>;
    case 'break':
      return <br />;
    case 'link':
      return renderLink(node.url, node.title, children());
    case 'image':
      return renderImage(node.url, node.alt, node.title);
    case 'linkReference': {
      const definition = context.definitions.get(node.identifier);
      return definition ? renderLink(definition.url, definition.title, children()) : children();
    }
    case 'imageReference': {
      const definition = context.definitions.get(node.identifier);
      return definition ? renderImage(definition.url, node.alt, definition.title) : null;
    }
    case 'footnoteReference':
      return <sup>{node.label ?? node.identifier}</sup>;
    case 'footnoteDefinition':
      return (
        <div>
          <sup>{node.label ?? node.identifier}</sup>{' '}
          {renderChildren(node, { ...context, tight: true })}
        </div>
      );
    default:
      // Raw `html` and `definition` nodes render nothing.
      return null;
  }
};

/** Renders a Markdown tree to React, dropping raw HTML and sanitizing `href` and `src`. */
export const renderMdast = (root: Root): ReactNode =>
  renderNode(root, { definitions: collectDefinitions(root, new Map()), tight: false });
