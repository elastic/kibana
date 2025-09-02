/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A record of attributes for an XML tag, where keys are attribute names
 * and values are the attribute values.
 * Values can be primitives that will be converted to strings.
 * `null` and `undefined` values will be omitted from the output.
 */
export type XmlAttributes = Record<string, string | number | boolean | null | undefined>;

/**
 * A map of special XML characters to their corresponding entities.
 * Used for escaping strings to be safely included in XML.
 * @private
 */
const _XML_ESCAPE_CHARS: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '"': '&quot;',
  "'": '&apos;',
};

/**
 * Escapes a string for safe inclusion in XML content or attributes.
 * @param unsafe The string to escape.
 * @returns A new string with special XML characters replaced by entities.
 * @private
 */
const _escapeXml = (unsafe: string): string => {
  return unsafe.replace(/[<>&"']/g, (char) => _XML_ESCAPE_CHARS[char] || char);
};

/**
 * Generates a valid XML tag string from a tag name, attributes, and optional content.
 *
 * - If `content` is null or undefined, a self-closing tag is generated (e.g., `<tagName attr="value" />`).
 * - If `content` is provided, a standard opening and closing tag is generated (e.g., `<tagName>content</tagName>`).
 * - Attribute values and content are automatically XML-escaped.
 */
export const generateXmlTag = (
  tagName: string,
  attributes?: XmlAttributes,
  content?: string | null
): string => {
  // 1. Build the attribute string from the attributes object
  const attributeString = attributes
    ? Object.entries(attributes)
        // Filter out any attributes with null or undefined values
        .filter(
          (pair): pair is [string, string | number | boolean] =>
            pair[1] !== null && pair[1] !== undefined
        )
        // Format as key="escaped_value"
        .map(([key, value]) => `${key}="${_escapeXml(String(value))}"`)
        .join(' ')
    : '';

  // Add a leading space only if there are attributes
  const formattedAttributes = attributeString ? ` ${attributeString}` : '';

  // 2. Determine tag type (self-closing vs. content)
  if (content === null || content === undefined) {
    // Self-closing tag
    return `<${tagName}${formattedAttributes} />`;
  } else {
    // Tag with content
    const escapedContent = _escapeXml(content);
    return `<${tagName}${formattedAttributes}>${escapedContent}</${tagName}>`;
  }
};
