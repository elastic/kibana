/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
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
  effectiveRecommendedEndpoints: Record<string, string[]>;
  sections: FeatureSection[];
  invalidEndpointIds: Set<string>;
  hasSavedObject: Record<string, boolean>;
  dirtyFeatureIds: ReadonlySet<string>;
  updateEndpoints: (featureId: string, endpointIds: string[]) => void;
  save: () => Promise<void>;
}

const getEffectiveEndpoints = (
  feature: { recommendedEndpoints: string[]; parentFeatureId?: string },
  recommendedEndpointsById: Map<string, string[]>
): string[] => {
  if (feature.recommendedEndpoints.length > 0) {
    return feature.recommendedEndpoints;
  }
  if (feature.parentFeatureId) {
    const parentEndpoints = recommendedEndpointsById.get(feature.parentFeatureId) ?? [];
    if (parentEndpoints.length > 0) {
      return parentEndpoints;
    }
  }
  return [defaultInferenceEndpoints.KIBANA_DEFAULT_CHAT_COMPLETION];
};

const toApiFormat = (assignments: Assignments) =>
  Object.entries(assignments).map(([featureId, ids]) => ({
    feature_id: featureId,
    endpoints: ids.map((id) => ({ id })),
  }));

const arraysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

// Returns only the assignments that differ from recommended, so the server-side fallback
// chain (recommendedEndpoints → parent) stays in effect for unchanged features.
const getChangedAssignments = (
  assignments: Assignments,
  registeredFeatures: InferenceFeatureResponse[],
  recommendedEndpointsById: Map<string, string[]>
): Assignments => {
  const featureById = new Map(registeredFeatures.map((f) => [f.featureId, f]));
  return Object.fromEntries(
    Object.entries(assignments).filter(([featureId, ids]) => {
      const feature = featureById.get(featureId);
      if (!feature) return true;
      const defaults = getEffectiveEndpoints(feature, recommendedEndpointsById);
      return !arraysEqual(ids, defaults);
    })
  );
};

export const useModelSettingsForm = (): ModelSettingsForm => {
  const { features: registeredFeatures, isLoading: isFeaturesLoading } = useRegisteredFeatures();
  const { data: settingsData, isLoading: isSettingsLoading } = useInferenceSettings();
  const { mutateAsync: saveSettings, isLoading: isSaving } = useSaveInferenceSettings();

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

  const effectiveRecommendedEndpoints = useMemo<Record<string, string[]>>(
    () =>
      Object.fromEntries(
        sections.flatMap(({ children }) =>
          children.map((f): [string, string[]] => [
            f.featureId,
            [...getEffectiveEndpoints(f, recommendedEndpointsById)],
          ])
        )
      ),
    [sections, recommendedEndpointsById]
  );

  const savedMap = useMemo(
    () =>
      new Map<string, string[]>(
        (settingsData?.data?.features ?? [])
          .map((f): [string, string[]] => [f.feature_id, (f.endpoints ?? []).map((e) => e.id)])
          .filter(([, ids]) => ids.length > 0)
      ),
    [settingsData]
  );

  const hasSavedObject = useMemo(
    () =>
      Object.fromEntries(
        sections.flatMap(({ children }) =>
          children.map((f): [string, boolean] => [f.featureId, savedMap.has(f.featureId)])
        )
      ),
    [sections, savedMap]
  );

  const defaultAssignments = useMemo((): Assignments => {
    return Object.fromEntries(
      sections.flatMap(({ children }) =>
        children.map((f): [string, string[]] => [
          f.featureId,
          savedMap.get(f.featureId) ?? [...getEffectiveEndpoints(f, recommendedEndpointsById)],
        ])
      )
    );
  }, [savedMap, sections, recommendedEndpointsById]);

  const [assignments, setAssignments] = useState<Assignments>(defaultAssignments);

  useEffect(() => {
    setAssignments(defaultAssignments);
  }, [defaultAssignments]);

  const invalidEndpointIds = useMemo(
    () => new Set<string>(settingsData?.invalidEndpoints ?? []),
    [settingsData]
  );

  const dirtyFeatureIds = useMemo<ReadonlySet<string>>(() => {
    const ids = new Set<string>();
    for (const [featureId, currentIds] of Object.entries(assignments)) {
      const defaults = defaultAssignments[featureId];
      if (!defaults || !arraysEqual(currentIds, defaults)) {
        ids.add(featureId);
      }
    }
    return ids;
  }, [assignments, defaultAssignments]);

  const isDirty = dirtyFeatureIds.size > 0;

  const updateEndpoints = useCallback((featureId: string, endpointIds: string[]) => {
    setAssignments((prev) => ({ ...prev, [featureId]: endpointIds }));
  }, []);

  const save = useCallback(async () => {
    const changed = getChangedAssignments(
      assignments,
      registeredFeatures,
      recommendedEndpointsById
    );
    await saveSettings({ features: toApiFormat(changed) });
  }, [saveSettings, assignments, registeredFeatures, recommendedEndpointsById]);

  return {
    isLoading,
    isSaving,
    isDirty,
    assignments,
    effectiveRecommendedEndpoints,
    sections,
    invalidEndpointIds,
    hasSavedObject,
    dirtyFeatureIds,
    updateEndpoints,
    save,
  };
};
