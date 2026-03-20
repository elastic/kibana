/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useInferenceSettings, useSaveInferenceSettings } from '../../hooks/use_inference_settings';
import { useRegisteredFeatures } from '../../hooks/use_registered_features';

type Assignments = Record<string, string[]>;

const getEffectiveEndpoints = (
  feature: { recommendedEndpoints: string[]; parentFeatureId?: string },
  parentEndpointsMap: Map<string, string[]>
): string[] =>
  feature.recommendedEndpoints.length > 0
    ? feature.recommendedEndpoints
    : feature.parentFeatureId
    ? parentEndpointsMap.get(feature.parentFeatureId) ?? []
    : [];

const toApiFormat = (assignments: Assignments) =>
  Object.entries(assignments).map(([featureId, ids]) => ({
    feature_id: featureId,
    endpoints: ids.map((id) => ({ id })),
  }));

export const useModelSettingsForm = () => {
  const { features: registeredFeatures, isLoading: isFeaturesLoading } = useRegisteredFeatures();
  const { data: settingsData, isLoading: isSettingsLoading } = useInferenceSettings();
  const { mutate: saveSettings, isLoading: isSaving } = useSaveInferenceSettings();

  const isLoading = isFeaturesLoading || isSettingsLoading;

  const sections = useMemo(() => {
    const children = registeredFeatures.filter((f) => f.parentFeatureId !== undefined);
    const parentIds = [...new Set(children.map((f) => f.parentFeatureId!))];

    return parentIds.map((parentId) => {
      const parent = registeredFeatures.find((f) => f.featureId === parentId);
      return {
        id: parentId,
        name: parent?.featureName ?? parentId,
        description: parent?.featureDescription ?? '',
        children: children.filter((f) => f.parentFeatureId === parentId),
      };
    });
  }, [registeredFeatures]);

  const parentEndpointsMap = useMemo(
    () => new Map(registeredFeatures.map((f) => [f.featureId, f.recommendedEndpoints])),
    [registeredFeatures]
  );

  const defaultAssignments = useMemo(() => {
    const savedMap = new Map(
      (settingsData?.data?.features ?? [])
        .map((f) => [f.feature_id, (f.endpoints ?? []).map((e) => e.id)])
        .filter(([, ids]) => ids.length > 0)
    );

    return Object.fromEntries(
      sections.flatMap(({ children }) =>
        children.map((f) => [
          f.featureId,
          savedMap.get(f.featureId) ?? [...getEffectiveEndpoints(f, parentEndpointsMap)],
        ])
      )
    );
  }, [settingsData, sections, parentEndpointsMap]);

  const [assignments, setAssignments] = useState<Assignments>(defaultAssignments);

  useEffect(() => {
    setAssignments(defaultAssignments);
  }, [defaultAssignments]);

  const isDirty = useMemo(
    () => JSON.stringify(assignments) !== JSON.stringify(defaultAssignments),
    [assignments, defaultAssignments]
  );

  const updateEndpoints = useCallback((featureId: string, endpointIds: string[]) => {
    setAssignments((prev) => ({ ...prev, [featureId]: endpointIds }));
  }, []);

  const save = useCallback(() => {
    saveSettings({ features: toApiFormat(assignments) });
  }, [saveSettings, assignments]);

  const resetSection = useCallback(
    (sectionId: string) => {
      const section = sections.find((s) => s.id === sectionId);
      if (!section) return;

      const resetEntries = Object.fromEntries(
        section.children.map((f) => [
          f.featureId,
          [...getEffectiveEndpoints(f, parentEndpointsMap)],
        ])
      );
      setAssignments((prev) => {
        const updated = { ...prev, ...resetEntries };
        saveSettings({ features: toApiFormat(updated) });
        return updated;
      });
    },
    [sections, saveSettings, parentEndpointsMap]
  );

  return {
    isLoading,
    isSaving,
    isDirty,
    assignments,
    sections,
    updateEndpoints,
    save,
    resetSection,
  };
};
