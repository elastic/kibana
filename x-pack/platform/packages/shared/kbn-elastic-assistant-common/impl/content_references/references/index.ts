/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SecurityAlertContentReference,
  SecurityAlertsPageContentReference,
  KnowledgeBaseEntryContentReference,
  ProductDocumentationContentReference,
  EsqlContentReference,
} from '../../schemas';
import { ContentReferenceId } from '../types';

/**
 * Generates a contentReference for the alerts count tool.
 * @param id id of the contentReference
 * @returns AlertsCountReference
 */
export const securityAlertsPageReference = (id: string): SecurityAlertsPageContentReference => {
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
export const securityAlertReference = (
  id: ContentReferenceId,
  alertId: string
): SecurityAlertContentReference => {
  return {
    type: 'SecurityAlert',
    id,
    alertId,
  };
};

/**
 * Generates a contentReference for when a knowledge base entry is referenced.
 * @param id id of the contentReference
 * @param knowledgeBaseEntryName name of the knowledge base entry
 * @param knowledgeBaseEntryId id of the knowledge base entry
 * @returns KnowledgeBaseReference
 */
export const knowledgeBaseReference = (
  id: ContentReferenceId,
  knowledgeBaseEntryName: string,
  knowledgeBaseEntryId: string
): KnowledgeBaseEntryContentReference => {
  return {
    type: 'KnowledgeBaseEntry',
    id,
    knowledgeBaseEntryName,
    knowledgeBaseEntryId,
  };
};

/**
 * Generates a contentReference for when a ESQL query is referenced.
 * @param id id of the contentReference
 * @param query the ESQL query
 * @param label content reference label
 * @returns KnowledgeBaseReference
 */
export const esqlQueryReference = (
  params: Omit<EsqlContentReference, 'type'>
): EsqlContentReference => {
  return {
    type: 'EsqlQuery',
    ...params,
  };
};

/**
 * Generates a contentReference for the alerts count tool.
 * @param id id of the contentReference
 * @returns AlertsCountReference
 */
export const productDocumentationReference = (
  id: ContentReferenceId,
  title: string,
  url: string
): ProductDocumentationContentReference => {
  return {
    type: 'ProductDocumentation',
    id,
    title,
    url,
  };
};
