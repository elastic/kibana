import { SecurityAlertContentReference, SecurityAlertsPageContentReference, ContentReference, KnowledgeBaseEntryContentReference } from "../../schemas";
import { ContentReferenceBlock } from "../types";

/**
 * Returns a contentReferenceBlock for a given ContentReference. A ContentReferenceBlock may be provided
 * to an LLM alongside grounding documents allowing the LLM to reference the documents in its output.
 * @param contentReference A ContentReference
 * @returns ContentReferenceBlock
 */
export const contentReferenceBlock = (contentReference: ContentReference): ContentReferenceBlock => {
    return `!{reference(${contentReference.id})}`
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
