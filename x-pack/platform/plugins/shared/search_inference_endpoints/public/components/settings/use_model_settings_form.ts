/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useInferenceSettings, useSaveInferenceSettings } from '../../hooks/use_inference_settings';
import { useRegisteredFeatures } from '../../hooks/use_registered_features';
import type { InferenceFeatureResponse } from '../../../common/types';

type Assignments = Record<string, string[]>;

export interface FeatureSection extends InferenceFeatureResponse {
  children: InferenceFeatureResponse[];
}

export interface ModelSettingsForm {
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  assignments: Assignments;
  sections: FeatureSection[];
  updateEndpoints: (featureId: string, endpointIds: string[]) => void;
  save: () => void;
  resetSection: (sectionId: string) => void;
}

const getEffectiveEndpoints = (
  feature: { recommendedEndpoints: string[]; parentFeatureId?: string },
  recommendedEndpointsById: Map<string, string[]>
): string[] =>
  feature.recommendedEndpoints.length > 0
    ? feature.recommendedEndpoints
    : feature.parentFeatureId
    ? recommendedEndpointsById.get(feature.parentFeatureId) ?? []
    : [];

const toApiFormat = (assignments: Assignments) =>
  Object.entries(assignments).map(([featureId, ids]) => ({
    feature_id: featureId,
    endpoints: ids.map((id) => ({ id })),
  }));

export const useModelSettingsForm = (): ModelSettingsForm => {
  const { features: registeredFeatures, isLoading: isFeaturesLoading } = useRegisteredFeatures();
  const { data: settingsData, isLoading: isSettingsLoading } = useInferenceSettings();
  const { mutate: saveSettings, isLoading: isSaving } = useSaveInferenceSettings();

  const isLoading = isFeaturesLoading || isSettingsLoading;

  const sections = useMemo((): FeatureSection[] => {
    const featureById = new Map(registeredFeatures.map((f) => [f.featureId, f]));
    const toSection = (f: InferenceFeatureResponse): FeatureSection => ({ ...f, children: [] });

    const sectionMap = registeredFeatures.reduce<Map<string, FeatureSection>>((result, feature) => {
      if (feature.parentFeatureId) {
        const parent = featureById.get(feature.parentFeatureId);
        if (parent) {
          if (!result.has(feature.parentFeatureId)) {
            result.set(feature.parentFeatureId, toSection(parent));
          }
          result.get(feature.parentFeatureId)!.children.push(feature);
        } else if (!result.has(feature.featureId)) {
          // orphaned child (invalid parentFeatureId) — register as standalone section
          result.set(feature.featureId, toSection(feature));
        }
      } else if (!result.has(feature.featureId)) {
        result.set(feature.featureId, toSection(feature));
      }

      return result;
    }, new Map<string, FeatureSection>());

    return Array.from(sectionMap.values());
  }, [registeredFeatures]);

  const recommendedEndpointsById = useMemo(
    () => new Map(registeredFeatures.map((f) => [f.featureId, f.recommendedEndpoints])),
    [registeredFeatures]
  );

  const defaultAssignments = useMemo((): Assignments => {
    const savedMap = new Map<string, string[]>(
      (settingsData?.data?.features ?? [])
        .map((f): [string, string[]] => [f.feature_id, (f.endpoints ?? []).map((e) => e.id)])
        .filter(([, ids]) => ids.length > 0)
    );

    return Object.fromEntries(
      sections.flatMap(({ children }) =>
        children.map((f): [string, string[]] => [
          f.featureId,
          savedMap.get(f.featureId) ?? [...getEffectiveEndpoints(f, recommendedEndpointsById)],
        ])
      )
    );
  }, [settingsData, sections, recommendedEndpointsById]);

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
      const section = sections.find((s) => s.featureId === sectionId);
      if (!section) return;

      const resetEntries = Object.fromEntries(
        section.children.map((f) => [
          f.featureId,
          [...getEffectiveEndpoints(f, recommendedEndpointsById)],
        ])
      );
      const updated = { ...assignments, ...resetEntries };
      setAssignments(updated);
      saveSettings({ features: toApiFormat(updated) });
    },
    [assignments, sections, saveSettings, recommendedEndpointsById]
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
