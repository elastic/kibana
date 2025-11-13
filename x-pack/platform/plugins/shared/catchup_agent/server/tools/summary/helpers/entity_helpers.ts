/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Score entities based on their appearance in correlations and related alerts
 */
export const scoreEntities = (
  extractedEntities: any,
  correlations: any[],
  relatedAlerts: any[]
): Map<string, number> => {
  const entityScores: Map<string, number> = new Map();

  // Score entities based on correlations
  if (correlations && Array.isArray(correlations)) {
    for (const corr of correlations) {
      if (corr.service) {
        entityScores.set(
          `service:${corr.service}`,
          (entityScores.get(`service:${corr.service}`) || 0) + 1
        );
      }
      if (corr.observability && typeof corr.observability === 'object') {
        const obsTitle = (corr.observability as any).title || '';
        const obsDesc = (corr.observability as any).description || '';
        const obsText = `${obsTitle} ${obsDesc}`.toLowerCase();
        // Check if any host names appear in observability case
        for (const hostName of extractedEntities.host_names || []) {
          if (obsText.includes(hostName.toLowerCase())) {
            entityScores.set(`host:${hostName}`, (entityScores.get(`host:${hostName}`) || 0) + 2);
          }
        }
      }
    }
  }

  // Score entities based on related alerts
  if (relatedAlerts && Array.isArray(relatedAlerts)) {
    for (const alert of relatedAlerts) {
      const alertHost = alert.host?.name || alert.host_name || alert['host.name'];
      const alertService = alert.service?.name || alert.service_name || alert['service.name'];
      const alertUser = alert.user?.name || alert.user_name || alert['user.name'];

      if (alertHost) {
        entityScores.set(`host:${alertHost}`, (entityScores.get(`host:${alertHost}`) || 0) + 1);
      }
      if (alertService) {
        entityScores.set(
          `service:${alertService}`,
          (entityScores.get(`service:${alertService}`) || 0) + 1
        );
      }
      if (alertUser) {
        entityScores.set(`user:${alertUser}`, (entityScores.get(`user:${alertUser}`) || 0) + 1);
      }
    }
  }

  return entityScores;
};

/**
 * Get sorted and limited entities by type
 */
export const getSortedEntities = (
  entities: string[],
  entityScores: Map<string, number>,
  entityType: 'host' | 'service' | 'user',
  limit: number
): Array<{ name: string; score: number }> => {
  return entities
    .map((name: string) => ({
      name,
      score: entityScores.get(`${entityType}:${name}`) || 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

/**
 * Find related alerts for an entity
 */
export const findRelatedAlerts = (
  entityName: string,
  entityType: 'host' | 'service' | 'user',
  relatedAlerts: any[]
): any[] => {
  return relatedAlerts.filter((a: any) => {
    if (entityType === 'host') {
      return (
        a.host?.name === entityName || a.host_name === entityName || a['host.name'] === entityName
      );
    }
    if (entityType === 'service') {
      return a.service?.name === entityName || a.service_name === entityName;
    }
    if (entityType === 'user') {
      return a.user?.name === entityName || a.user_name === entityName;
    }
    return false;
  });
};

/**
 * Find related cases for an entity
 */
export const findRelatedCases = (entityName: string, allCases: any[]): any[] => {
  return allCases.filter(
    (c: any) =>
      c.title?.toLowerCase().includes(entityName.toLowerCase()) ||
      c.description?.toLowerCase().includes(entityName.toLowerCase())
  );
};
