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
/**
 * Recursively generates a formatted XML string from a tree of `XmlNode` objects.
 *
 * @param node The root `XmlNode` of the XML tree.
 * @param options Optional configuration for indentation.
 * @returns A formatted XML string with proper nesting and indentation.
 */
export declare const generateXmlTree: (node: XmlNode, options?: XmlOptions) => string;
