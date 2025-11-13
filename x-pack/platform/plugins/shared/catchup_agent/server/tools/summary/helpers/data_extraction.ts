/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Recursively search for a key in an object tree
 */
export const findNestedKey = (
  obj: any,
  key: string,
  maxDepth: number = 5,
  currentDepth: number = 0
): any => {
  if (currentDepth >= maxDepth || !obj || typeof obj !== 'object') {
    return null;
  }

  // Handle arrays by searching each element
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findNestedKey(item, key, maxDepth, currentDepth + 1);
      if (found !== null) return found;
    }
    return null;
  }

  // Direct key match
  if (key in obj) {
    return obj[key];
  }

  // Recursively search in object values
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') {
      const found = findNestedKey(value, key, maxDepth, currentDepth + 1);
      if (found !== null) return found;
    }
  }

  return null;
};

/**
 * Helper function to extract and parse data from workflow tool response structure
 * Workflow tools return {results: [{data: {content: "<json string>"}}]} or {results: [{data: "<json string>"}]}
 * This function handles:
 * 1. Workflow response structure with content: {results: [{data: {content: "..."}}]}
 * 2. Workflow response structure with direct data: {results: [{data: "..."}]}
 * 3. Direct data objects (when template engine preserves objects)
 * 4. JSON strings (legacy format)
 */
export const extractDataFromResponse = (value: any): any => {
  if (!value) return {};

  // If it's a workflow tool response structure, extract the data
  if (value.results && Array.isArray(value.results) && value.results.length > 0) {
    const data = value.results[0]?.data;
    // Check if data has a content property (workflow tool format: {data: {content: "..."}})
    if (data && typeof data === 'object' && 'content' in data) {
      const content = data.content;
      if (typeof content === 'string') {
        try {
          const parsed = JSON.parse(content);
          // If the parsed result is still a string (double-stringified), parse again
          if (typeof parsed === 'string') {
            try {
              return JSON.parse(parsed);
            } catch {
              return {};
            }
          }
          return parsed;
        } catch {
          return {};
        }
      }
      // If content is not a string, return it as-is
      return content || {};
    }
    // If data is a JSON string, parse it
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        // If the parsed result is still a string (double-stringified), parse again
        if (typeof parsed === 'string') {
          try {
            return JSON.parse(parsed);
          } catch {
            return {};
          }
        }
        return parsed;
      } catch {
        return {};
      }
    }
    // Otherwise, return data as-is (already an object)
    return data || {};
  }

  // If it's already a JSON string, parse it
  if (typeof value === 'string') {
    // Check if it's the "[object Object]" string (which means it was incorrectly stringified)
    if (value === '[object Object]') {
      return {};
    }
    try {
      const parsed = JSON.parse(value);
      // Check if parsed result is a workflow response structure
      if (
        parsed &&
        typeof parsed === 'object' &&
        parsed.results &&
        Array.isArray(parsed.results)
      ) {
        // Recursively extract from the workflow response structure
        return extractDataFromResponse(parsed);
      }
      // If the parsed result is still a string (double-stringified), parse again
      if (typeof parsed === 'string') {
        try {
          return JSON.parse(parsed);
        } catch {
          return {};
        }
      }
      return parsed;
    } catch {
      return {};
    }
  }

  // Otherwise, assume it's already the data object (template engine preserved it)
  return value;
};

/**
 * Extract and normalize all correlated data from the input
 */
export const extractCorrelatedData = (correlatedData: Record<string, unknown>) => {
  const securityRaw = correlatedData.security_summary || {};
  const observabilityRaw = correlatedData.observability || {};
  const searchRaw = correlatedData.search || {};
  const externalRaw = correlatedData.external || {};
  const correlationsRaw = correlatedData.correlations || [];
  const entitiesRaw = correlatedData.entities || {};
  const relatedAlertsRaw = correlatedData.related_alerts || {};

  const security = extractDataFromResponse(securityRaw);
  const observability = extractDataFromResponse(observabilityRaw);
  const search = extractDataFromResponse(searchRaw);

  // Extract entities and related alerts
  const entitiesData = extractDataFromResponse(entitiesRaw);
  const relatedAlertsData = extractDataFromResponse(relatedAlertsRaw);

  // Handle external object which may contain nested workflow responses
  const external: any = {};
  if (externalRaw && typeof externalRaw === 'object' && !Array.isArray(externalRaw)) {
    for (const [key, value] of Object.entries(externalRaw)) {
      external[key] = extractDataFromResponse(value);
    }
  } else {
    Object.assign(external, extractDataFromResponse(externalRaw));
  }

  // Handle correlations - could be array or nested in response
  let correlations: any[] = [];
  if (Array.isArray(correlationsRaw)) {
    correlations = correlationsRaw;
  } else {
    const extracted = extractDataFromResponse(correlationsRaw);

    if (Array.isArray(extracted)) {
      correlations = extracted;
    } else if (extracted && typeof extracted === 'object') {
      // First try direct access to common locations
      if (extracted.correlations && Array.isArray(extracted.correlations)) {
        correlations = extracted.correlations;
      } else if (extracted.prioritized_items && Array.isArray(extracted.prioritized_items)) {
        correlations = extracted.prioritized_items;
      } else {
        // Recursively search for correlations array anywhere in the object tree
        const foundCorrelations = findNestedKey(extracted, 'correlations');
        if (foundCorrelations && Array.isArray(foundCorrelations)) {
          correlations = foundCorrelations;
        } else {
          // Try searching for prioritized_items as well
          const foundPrioritized = findNestedKey(extracted, 'prioritized_items');
          if (foundPrioritized && Array.isArray(foundPrioritized)) {
            correlations = foundPrioritized;
          }
        }
      }
    }
  }

  // Fallback: if no correlations found, check if they're in reranker output
  if (correlations.length === 0) {
    const rerankerOutput =
      correlatedData.prioritize_with_reranker || correlatedData.reranker_output;
    if (rerankerOutput) {
      const rerankerExtracted = extractDataFromResponse(rerankerOutput);
      if (
        rerankerExtracted?.prioritized_items &&
        Array.isArray(rerankerExtracted.prioritized_items)
      ) {
        correlations = rerankerExtracted.prioritized_items;
      } else {
        // Try recursive search in reranker output
        const found =
          findNestedKey(rerankerExtracted, 'correlations') ||
          findNestedKey(rerankerExtracted, 'prioritized_items');
        if (found && Array.isArray(found)) {
          correlations = found;
        }
      }
    }
  }

  return {
    security,
    observability,
    search,
    external,
    correlations,
    entitiesData,
    relatedAlertsData,
  };
};

