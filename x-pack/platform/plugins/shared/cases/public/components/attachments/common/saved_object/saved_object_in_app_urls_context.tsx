/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { CaseUI } from '../../../../../common/ui/types';
import { useSavedObjectInAppUrlsQuery } from './use_saved_object_in_app_url';
import { getSavedObjectAttachmentAttributes, type SupportedSavedObjectType } from './helpers';

type UrlsBySoType = Record<SupportedSavedObjectType, Record<string, string | undefined>>;

const SavedObjectInAppUrlsContext = createContext<UrlsBySoType | null>(null);

export const useSavedObjectInAppUrlsContext = () => useContext(SavedObjectInAppUrlsContext);

interface SavedObjectInAppUrlsProviderProps {
  caseData: CaseUI;
  children: React.ReactNode;
}

/**
 * Pre-resolves in-app URLs for every SO-typed attachment on the case (one
 * `bulk_get` per SO type) and exposes the result via context. Downstream
 * consumers (`SavedObjectAddedEvent` in the timeline, `SavedObjectAttachmentsTable`
 * in the attachments tab) read from this map instead of each firing their own
 * request — avoiding N requests in the activity feed when N SO events are
 * rendered.
 */
export const SavedObjectInAppUrlsProvider: React.FC<SavedObjectInAppUrlsProviderProps> = ({
  caseData,
  children,
}) => {
  const idsBySoType = useMemo(() => {
    const dashboardIds = new Set<string>();
    const mapIds = new Set<string>();
    const searchIds = new Set<string>();
    for (const comment of caseData.comments) {
      const attributes = getSavedObjectAttachmentAttributes(comment);
      if (attributes) {
        if (attributes.soType === 'dashboard') {
          dashboardIds.add(attributes.attachmentId);
        } else if (attributes.soType === 'map') {
          mapIds.add(attributes.attachmentId);
        } else if (attributes.soType === 'search') {
          searchIds.add(attributes.attachmentId);
        }
      }
    }
    return {
      dashboard: Array.from(dashboardIds),
      map: Array.from(mapIds),
      search: Array.from(searchIds),
    };
  }, [caseData.comments]);

  const dashboardUrls = useSavedObjectInAppUrlsQuery('dashboard', idsBySoType.dashboard);
  const mapUrls = useSavedObjectInAppUrlsQuery('map', idsBySoType.map);
  const searchUrls = useSavedObjectInAppUrlsQuery('search', idsBySoType.search);

  const value = useMemo<UrlsBySoType>(
    () => ({ dashboard: dashboardUrls, map: mapUrls, search: searchUrls }),
    [dashboardUrls, mapUrls, searchUrls]
  );

  return (
    <SavedObjectInAppUrlsContext.Provider value={value}>
      {children}
    </SavedObjectInAppUrlsContext.Provider>
  );
};

SavedObjectInAppUrlsProvider.displayName = 'SavedObjectInAppUrlsProvider';
