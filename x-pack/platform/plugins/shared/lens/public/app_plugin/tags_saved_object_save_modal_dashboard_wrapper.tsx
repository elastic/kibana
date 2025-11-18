/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState, useMemo, useCallback } from 'react';
import type { OnSaveProps } from '@kbn/saved-objects-plugin/public';
import type { SaveModalDashboardProps } from '@kbn/presentation-util-plugin/public';
import {
  LazySavedObjectSaveModalDashboard,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import type { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';

export type DashboardSaveProps = OnSaveProps & {
  returnToOrigin: boolean;
  dashboardId?: string | null;
  addToLibrary?: boolean;
  newTags?: string[];
};

export type TagEnhancedSavedObjectSaveModalDashboardProps = Omit<
  SaveModalDashboardProps,
  'onSave'
> & {
  initialTags: string[];
  savedObjectsTagging?: SavedObjectTaggingPluginStart;
  onSave: (props: DashboardSaveProps) => Promise<void>;
  getOriginatingPath?: (dashboardId: string) => string;
};

const SavedObjectSaveModalDashboard = withSuspense(LazySavedObjectSaveModalDashboard);

export const TagEnhancedSavedObjectSaveModalDashboard: FC<
  TagEnhancedSavedObjectSaveModalDashboardProps
> = ({ initialTags, onSave, savedObjectsTagging, ...otherProps }) => {
  const [selectedTags, setSelectedTags] = useState(initialTags);

  const tagSelectorOption = useMemo(
    () =>
      savedObjectsTagging ? (
        <savedObjectsTagging.ui.components.SavedObjectSaveModalTagSelector
          initialSelection={initialTags}
          onTagsSelected={setSelectedTags}
          markOptional
        />
      ) : undefined,
    [savedObjectsTagging, initialTags]
  );

  const tagEnhancedOptions = <>{tagSelectorOption}</>;

  const tagEnhancedOnSave = useCallback<SaveModalDashboardProps['onSave']>(
    async (saveOptions) => {
      await onSave({
        ...saveOptions,
        returnToOrigin: false,
        newTags: selectedTags,
      });
    },
    [onSave, selectedTags]
  );

  return (
    <SavedObjectSaveModalDashboard
      {...otherProps}
      onSave={tagEnhancedOnSave}
      tagOptions={tagEnhancedOptions}
    />
  );
};
