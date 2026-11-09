/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { isEqual, pick } from 'lodash';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { useInferenceSettings, useSaveInferenceSettings } from '../../hooks/use_inference_settings';
import { useRegisteredFeatures } from '../../hooks/use_registered_features';
import type {
  InferenceEndpointSetting,
  InferenceFeatureResponse,
  ReasoningEffortLevel,
} from '../../../common/types';
import type { EndpointEfforts } from '../../types';

type Assignments = Record<string, string[]>;
type FeatureEfforts = Record<string, EndpointEfforts>;
type SavedEndpoints = Map<string, InferenceEndpointSetting[]>;

export interface FeatureSection extends InferenceFeatureResponse {
  children: InferenceFeatureResponse[];
}

export interface ModelSettingsForm {
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  assignments: Assignments;
  efforts: FeatureEfforts;
  effectiveRecommendedEndpoints: Record<string, string[]>;
  effectiveRecommendedEfforts: FeatureEfforts;
  sections: FeatureSection[];
  invalidEndpointIds: Set<string>;
  hasSavedObject: Record<string, boolean>;
  dirtyFeatureIds: ReadonlySet<string>;
  updateEndpoints: (featureId: string, endpointIds: string[]) => void;
  updateEfforts: (featureId: string, endpointEfforts: EndpointEfforts) => void;
  save: () => Promise<void>;
}

const getEffectiveEndpoints = (
  feature: {
    recommendedEndpoints: string[];
    parentFeatureId?: string;
    ignoreGlobalDefault?: boolean;
  },
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
  // A row that opts out of the global default, and has nothing of its own to recommend,
  // stays empty. Substituting the Kibana default would show a model the workers do not use.
  if (feature.ignoreGlobalDefault) {
    return [];
  }
  return [defaultInferenceEndpoints.KIBANA_DEFAULT_CHAT_COMPLETION];
};

const getEffectiveRecommendedEfforts = (
  feature: InferenceFeatureResponse,
  featureById: Map<string, InferenceFeatureResponse>
): EndpointEfforts => {
  const parentFeature =
    feature.recommendedEndpoints.length === 0 && feature.parentFeatureId !== undefined
      ? featureById.get(feature.parentFeatureId)
      : undefined;
  const { recommendedEndpointParameters = {} } = parentFeature ?? feature;
  return Object.fromEntries(
    Object.entries(recommendedEndpointParameters).flatMap(
      ([endpointId, { reasoning }]): Array<[string, ReasoningEffortLevel]> => {
        const effort = reasoning?.effort;
        return effort !== undefined ? [[endpointId, effort]] : [];
      }
    )
  );
};

const getSavedEfforts = (endpoints: InferenceEndpointSetting[]): EndpointEfforts =>
  Object.fromEntries(
    endpoints.flatMap(({ id, parameters }): Array<[string, ReasoningEffortLevel]> => {
      const effort = parameters?.reasoning?.effort;
      return effort !== undefined ? [[id, effort]] : [];
    })
  );

const toApiFormat = (assignments: Assignments, efforts: FeatureEfforts) =>
  Object.entries(assignments).map(([featureId, ids]) => ({
    feature_id: featureId,
    endpoints: ids.map((id): InferenceEndpointSetting => {
      const effort = efforts[featureId]?.[id];
      return effort !== undefined ? { id, parameters: { reasoning: { effort } } } : { id };
    }),
  }));

const arraysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

// Returns only the assignments that differ from recommended, so the server-side fallback
// chain (recommendedEndpoints → parent) stays in effect for unchanged features.
const getChangedAssignments = (
  assignments: Assignments,
  efforts: FeatureEfforts,
  registeredFeatures: InferenceFeatureResponse[],
  recommendedEndpointsById: Map<string, string[]>,
  effectiveRecommendedEfforts: FeatureEfforts
): Assignments => {
  const featureById = new Map(registeredFeatures.map((f) => [f.featureId, f]));
  return Object.fromEntries(
    Object.entries(assignments).filter(([featureId, ids]) => {
      const feature = featureById.get(featureId);
      if (!feature) return true;
      const defaults = getEffectiveEndpoints(feature, recommendedEndpointsById);
      if (!arraysEqual(ids, defaults)) return true;
      return !isEqual(efforts[featureId] ?? {}, effectiveRecommendedEfforts[featureId] ?? {});
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

  const effectiveRecommendedEfforts = useMemo<FeatureEfforts>(() => {
    const featureById = new Map(registeredFeatures.map((f) => [f.featureId, f]));
    return Object.fromEntries(
      sections.flatMap(({ children }) =>
        children.map((f): [string, EndpointEfforts] => [
          f.featureId,
          getEffectiveRecommendedEfforts(f, featureById),
        ])
      )
    );
  }, [sections, registeredFeatures]);

  const savedEndpoints = useMemo<SavedEndpoints>(
    () =>
      new Map(
        (settingsData?.data?.features ?? []).map((f): [string, InferenceEndpointSetting[]] => [
          f.feature_id,
          f.endpoints ?? [],
        ])
      ),
    [settingsData]
  );

  const savedMap = useMemo(
    () =>
      new Map<string, string[]>(
        [...savedEndpoints]
          .map(([featureId, endpoints]): [string, string[]] => [
            featureId,
            endpoints.map((e) => e.id),
          ])
          .filter(([, ids]) => ids.length > 0)
      ),
    [savedEndpoints]
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

  const defaultEfforts = useMemo(
    (): FeatureEfforts =>
      Object.fromEntries(
        sections.flatMap(({ children }) =>
          children.map((f): [string, EndpointEfforts] => {
            const saved = savedMap.has(f.featureId) ? savedEndpoints.get(f.featureId) : undefined;
            return [
              f.featureId,
              saved ? getSavedEfforts(saved) : effectiveRecommendedEfforts[f.featureId] ?? {},
            ];
          })
        )
      ),
    [sections, savedMap, savedEndpoints, effectiveRecommendedEfforts]
  );

  const [efforts, setEfforts] = useState<FeatureEfforts>(defaultEfforts);

  useEffect(() => {
    setEfforts(defaultEfforts);
  }, [defaultEfforts]);

  const invalidEndpointIds = useMemo(
    () => new Set<string>(settingsData?.invalidEndpoints ?? []),
    [settingsData]
  );

  const dirtyFeatureIds = useMemo<ReadonlySet<string>>(() => {
    const ids = new Set<string>();
    for (const [featureId, currentIds] of Object.entries(assignments)) {
      const defaults = defaultAssignments[featureId];
      const hasChangedEndpoints = !defaults || !arraysEqual(currentIds, defaults);
      const hasChangedEfforts = !isEqual(efforts[featureId] ?? {}, defaultEfforts[featureId] ?? {});
      if (hasChangedEndpoints || hasChangedEfforts) {
        ids.add(featureId);
      }
    }
    return ids;
  }, [assignments, defaultAssignments, efforts, defaultEfforts]);

  const isDirty = dirtyFeatureIds.size > 0;

  const updateEndpoints = useCallback((featureId: string, endpointIds: string[]) => {
    setAssignments((prev) => ({ ...prev, [featureId]: endpointIds }));
    setEfforts((prev) => ({ ...prev, [featureId]: pick(prev[featureId], endpointIds) }));
  }, []);

  const updateEfforts = useCallback((featureId: string, endpointEfforts: EndpointEfforts) => {
    setEfforts((prev) => ({ ...prev, [featureId]: endpointEfforts }));
  }, []);

  const save = useCallback(async () => {
    const changed = getChangedAssignments(
      assignments,
      efforts,
      registeredFeatures,
      recommendedEndpointsById,
      effectiveRecommendedEfforts
    );
    await saveSettings({ features: toApiFormat(changed, efforts) });
  }, [
    saveSettings,
    assignments,
    efforts,
    registeredFeatures,
    recommendedEndpointsById,
    effectiveRecommendedEfforts,
  ]);

  return {
    isLoading,
    isSaving,
    isDirty,
    assignments,
    efforts,
    effectiveRecommendedEndpoints,
    effectiveRecommendedEfforts,
    sections,
    invalidEndpointIds,
    hasSavedObject,
    dirtyFeatureIds,
    updateEndpoints,
    updateEfforts,
    save,
  };
};
