import { ContentReference } from "../../schemas";
import { ContentReferenceBlock, ContentReferenceId } from "../types";

/**
 * Returns "Arid2" from "{reference(Arid2)}"
 * @param contentReference A ContentReferenceBlock
 * @returns ContentReferenceId
 */
export const getContentReferenceId = (contentReferenceBlock: ContentReferenceBlock): ContentReferenceId => {
    return contentReferenceBlock.replace("{reference(", "").replace(")}", "");
};

/**
 * Returns a contentReferenceBlock for a given ContentReference. A ContentReferenceBlock may be provided
 * to an LLM alongside grounding documents allowing the LLM to reference the documents in its output.
 * @param contentReference A ContentReference
 * @returns ContentReferenceBlock
 */
export const contentReferenceBlock = (contentReference: ContentReference): ContentReferenceBlock => {
    return `{reference(${contentReference.id})}`;
};

/**
 * Simplifies passing a contentReferenceBlock alongside grounding documents.
 * @param contentReference A ContentReference
 * @returns the string: `Reference: <contentReferenceBlock>`
 */
export const contentReferenceString = (contentReference: ContentReference) => {
    return `Reference: ${contentReferenceBlock(contentReference)}` as const;
};

/**
 * Removed content references from conent.
 * @param content content to remove content references from
 * @returns content with content references replaced with ''
 */
export const removeContentReferences = (content: String) => {
    return content.replaceAll(/\{reference\(.*?\)\}/g, '');
};
