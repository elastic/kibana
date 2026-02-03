/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useEffect, useRef } from 'react';
import { useKibana } from '../../../common/lib/kibana';

export interface DashboardMetadata {
  title?: string;
  inAppUrl?: { path: string };
}

interface SavedObjectResponse {
  id: string;
  type: string;
  meta?: DashboardMetadata;
  attributes?: { title?: string };
  error?: { statusCode: number; message: string };
}

export const useDashboardMetadata = (
  attachmentIds: string[]
): {
  metadata: Record<string, DashboardMetadata>;
  isLoading: boolean;
  error?: Error;
} => {
  const { http } = useKibana().services;
  const httpRef = useRef(http);
  const [metadata, setMetadata] = useState<Record<string, DashboardMetadata>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();

  // Keep http ref up to date
  httpRef.current = http;

  useEffect(() => {
    if (attachmentIds.length === 0) {
      setMetadata({});
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchMetadata = async () => {
      setIsLoading(true);
      setError(undefined);

      const metadataMap: Record<string, DashboardMetadata> = {};
      const uniqueDashboards = new Map<string, { type: string; id: string }>();

      // Deduplicate attachment IDs
      attachmentIds.forEach((id) => {
        const key = `dashboard:${id}`;
        if (!uniqueDashboards.has(key)) {
          uniqueDashboards.set(key, {
            type: 'dashboard',
            id,
          });
        }
      });

      try {
        const objectsToFetch = Array.from(uniqueDashboards.values());
        const response = await httpRef.current.post<SavedObjectResponse[]>(
          '/api/kibana/management/saved_objects/_bulk_get',
          {
            body: JSON.stringify(objectsToFetch),
          }
        );

        if (cancelled) return;

        response.forEach((obj) => {
          const key = `dashboard:${obj.id}`;
          if (obj.error) {
            // If we can't fetch the dashboard, use the ID as fallback
            metadataMap[key] = {
              title: obj.id,
            };
          } else {
            metadataMap[key] = {
              title: obj.meta?.title || obj.attributes?.title || obj.id,
              inAppUrl: obj.meta?.inAppUrl,
            };
          }
        });

        setMetadata(metadataMap);
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;

        // If bulk fetch fails, fall back to using IDs as titles
        uniqueDashboards.forEach(({ id }) => {
          const key = `dashboard:${id}`;
          metadataMap[key] = {
            title: id,
          };
        });
        setError(err as Error);
        setMetadata(metadataMap);
        setIsLoading(false);
      }
    };

    fetchMetadata();

    return () => {
      cancelled = true;
    };
  }, [attachmentIds]);

  return { metadata, isLoading, error };
};
