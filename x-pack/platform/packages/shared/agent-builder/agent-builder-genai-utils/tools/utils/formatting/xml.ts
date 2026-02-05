/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A record of attributes for an XML tag.
 * `null` and `undefined` values will be omitted.
 */
export type XmlAttributes = Record<string, string | number | boolean | null | undefined>;

/**
 * Represents a node in an XML tree.
 * - `tagName` is the name of the XML element.
 * - `attributes` is an optional map of the element's attributes.
 * - `children` is an optional array that can contain either strings (for text content)
 * or other `XmlNode` objects for nesting.
 */
export interface XmlNode {
  tagName: string;
  attributes?: XmlAttributes;
  children?: (XmlNode | string)[];
}

/**
 * Configuration options for XML generation.
 */
export interface XmlOptions {
  /** The string to use for each level of indentation. Defaults to '  ' (two spaces). */
  indentChar?: string;
  /** The initial indentation level. Defaults to 0. */
  initialIndentLevel?: number;
  /** Whether to escape special XML characters in text content. Defaults to true. */
  escapeContent?: boolean;
}

// =================================================================================
// PRIVATE HELPERS (mostly unchanged from your original)
// =================================================================================

const _XML_ESCAPE_CHARS: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '"': '&quot;',
  "'": '&apos;',
};

const _escapeXml = (unsafe: string): string => {
  return unsafe.replace(/[<>&"']/g, (char) => _XML_ESCAPE_CHARS[char] || char);
};

/**
 * Builds the attribute string for an XML tag.
 * @private
 */
const _buildAttributeString = (attributes?: XmlAttributes): string => {
  if (!attributes) {
    return '';
  }
  const attributeString = Object.entries(attributes)
    .filter(
      (pair): pair is [string, string | number | boolean] =>
        pair[1] !== null && pair[1] !== undefined
    )
    .map(([key, value]) => `${key}="${_escapeXml(String(value))}"`)
    .join(' ');

  return attributeString ? ` ${attributeString}` : '';
};

/**
 * Recursively generates a formatted XML string from a tree of `XmlNode` objects.
 *
 * @param node The root `XmlNode` of the XML tree.
 * @param options Optional configuration for indentation.
 * @returns A formatted XML string with proper nesting and indentation.
 */
export const generateXmlTree = (node: XmlNode, options: XmlOptions = {}): string => {
  const { indentChar = '  ', initialIndentLevel = 0, escapeContent = true } = options;

  const maybeEscape = (text: string): string => (escapeContent ? _escapeXml(text) : text);

  /**
   * The internal recursive function that does the rendering.
   * @param currentNode The node or string to render.
   * @param level The current indentation level.
   */
  const _render = (currentNode: XmlNode | string, level: number): string => {
    const indent = indentChar.repeat(level);

    // Base case: If the current "node" is just a string, optionally escape it and indent it.
    if (typeof currentNode === 'string') {
      return indent + maybeEscape(currentNode);
    }

    const { tagName, attributes, children } = currentNode;
    const attributeString = _buildAttributeString(attributes);

    // Case 1: No children, create a self-closing tag.
    if (!children || children.length === 0) {
      return `${indent}<${tagName}${attributeString} />`;
    }

    // Case 2: The only child is a single string, create a single-line tag.
    // This avoids unnecessary newlines for simple content like `<name>John Doe</name>`.
    if (children.length === 1 && typeof children[0] === 'string') {
      const content = maybeEscape(children[0]);
      return `${indent}<${tagName}${attributeString}>${content}</${tagName}>`;
    }

    // Case 3: Nested children, build the multi-line block with recursion.
    const openingTag = `${indent}<${tagName}${attributeString}>`;
    const closingTag = `${indent}</${tagName}>`;

    const childrenContent = children
      .map((child) => _render(child, level + 1)) // Recurse with increased indentation!
      .join('\n');

    return [openingTag, childrenContent, closingTag].join('\n');
  };

  return _render(node, initialIndentLevel);
};
