import { SecurityAlertContentReference, SecurityAlertsPageContentReference, ContentReference, KnowledgeBaseEntryContentReference, ProductDocumentationContentReference } from "../../schemas";
import { ContentReferenceBlock } from "../types";

/**
 * Returns a contentReferenceBlock for a given ContentReference. A ContentReferenceBlock may be provided
 * to an LLM alongside grounding documents allowing the LLM to reference the documents in its output.
 * @param contentReference A ContentReference
 * @returns ContentReferenceBlock
 */
export const contentReferenceBlock = (contentReference: ContentReference): ContentReferenceBlock => {
    return `{reference(${contentReference.id})}`
}

/**
 * Simplifies passing a contentReferenceBlock alongside grounding documents.
 * @param contentReference A ContentReference
 * @returns the string: `Reference: <contentReferenceBlock>`
 */
export const contentReferenceString = (contentReference: ContentReference) => {
    return `Reference: ${contentReferenceBlock(contentReference)}` as const
}

/**
 * Removed content references from conent.
 * @param content content to remove content references from
 * @returns content with content references replaced with ''
 */
export const removeContentReferences = (content: String) => {
    return content.replaceAll(/\{reference\(.*?\)\}/g, '');
}

/**
 * Generates a contentReference for the alerts count tool.
 * @param id id of the contentReference
 * @returns AlertsCountReference
 */
export const alertsCountReferenceFactory = (id: string): SecurityAlertsPageContentReference => {
    return {
        type: "SecurityAlertsPage",
        id,
    }
}

/**
 * Generates a contentReference for when a specific alert is referenced.
 * @param id id of the contentReference
 * @param alertId id of the alert that is referenced
 * @returns AlertReference
 */
export const alertReferenceFactory = (id: string, alertId: string): SecurityAlertContentReference => {
    return {
        type: "SecurityAlert",
        id,
        alertId,
    }
}

/**
 * Generates a contentReference for when a knowledge base entry is referenced.
 * @param id id of the contentReference
 * @param knowledgeBaseEntryName name of the knowledge base entry
 * @param knowledgeBaseEntryId id of the knowledge base entry
 * @returns KnowledgeBaseReference
 */
export const knowledgeBaseReferenceFactory = (id: string, knowledgeBaseEntryName: string, knowledgeBaseEntryId: string): KnowledgeBaseEntryContentReference => {
    return {
        type: "KnowledgeBaseEntry",
        id,
        knowledgeBaseEntryName,
        knowledgeBaseEntryId,
    }
}

/**
 * Generates a contentReference for the alerts count tool.
 * @param id id of the contentReference
 * @returns AlertsCountReference
 */
export const productDocumentationReferenceFactory = (id: string, title: string, url: string): ProductDocumentationContentReference => {
    return {
        type: "ProductDocumentation",
        id,
        title,
        url
    }
}
