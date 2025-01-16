import { SecurityAlertContentReference, SecurityAlertsPageContentReference, KnowledgeBaseEntryContentReference, ProductDocumentationContentReference } from "../../schemas";
import { ContentReferenceId } from "../types";

/**
 * Generates a contentReference for the alerts count tool.
 * @param id id of the contentReference
 * @returns AlertsCountReference
 */
export const alertsCountReferenceFactory = (id: string): SecurityAlertsPageContentReference => {
  return {
    type: 'SecurityAlertsPage',
    id,
  };
};

/**
 * Generates a contentReference for when a specific alert is referenced.
 * @param id id of the contentReference
 * @param alertId id of the alert that is referenced
 * @returns AlertReference
 */
export const alertReferenceFactory = (id: ContentReferenceId, alertId: string): SecurityAlertContentReference => {
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
export const knowledgeBaseReferenceFactory = (id: ContentReferenceId, knowledgeBaseEntryName: string, knowledgeBaseEntryId: string): KnowledgeBaseEntryContentReference => {
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
export const productDocumentationReferenceFactory = (id: ContentReferenceId, title: string, url: string): ProductDocumentationContentReference => {
    return {
        type: "ProductDocumentation",
        id,
        title,
        url
    }
}
