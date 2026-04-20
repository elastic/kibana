/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { asyncForEach } from '@kbn/std';
import { uniqWith, isEqual } from 'lodash';
import {
  JOB_MAP_NODE_TYPES,
  type AnalyticsMapReturnType,
  type MapElements,
} from '@kbn/ml-data-frame-analytics-utils';
import { useMlApi } from '../../../contexts/kibana';

export interface GetDataObjectParameter {
  analyticsId?: string;
  id?: string;
  modelId?: string;
  type?: string;
}

export const useFetchAnalyticsMapData = () => {
  const mlApi = useMlApi();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [elements, setElements] = useState<MapElements[]>([]);
  const [error, setError] = useState<any>();
  const [message, setMessage] = useState<string | undefined>();
  // Keeps track of which nodes have been used as root so we can refetch related nodes on refresh
  const [usedAsRoot, setUsedAsRoot] = useState<Record<string, string | undefined>>({});
  const nodeDetails = useRef<Record<string, any>>({});

  const fetchAndSetElements = async (idToUse: string, treatAsRoot: boolean, type?: string) => {
    setIsLoading(true);
    if (treatAsRoot && usedAsRoot[idToUse] === undefined) {
      setUsedAsRoot({ ...usedAsRoot, [idToUse]: type });
    }
    // Pass in treatAsRoot flag - endpoint will take job or index to grab jobs created from it
    const analyticsMap: AnalyticsMapReturnType =
      await mlApi.dataFrameAnalytics.getDataFrameAnalyticsMap(idToUse, treatAsRoot, type);

    const { elements: nodeElements, details, error: fetchError } = analyticsMap;

    if (fetchError !== null) {
      setError(fetchError);
      setIsLoading(false);
      return;
    }

    if (nodeElements?.length === 0) {
      setMessage(
        i18n.translate('xpack.ml.dataframe.analyticsMap.emptyResponseMessage', {
          defaultMessage: 'No related analytics jobs found for {id}.',
          values: { id: idToUse },
        })
      );
    }

    if (nodeElements?.length > 0) {
      if (treatAsRoot === false) {
        if (!isEqual(nodeElements, elements)) {
          setElements(nodeElements);
        }
        nodeDetails.current = details;
      } else {
        // Existing elements come first so ID-based dedup preserves their state
        // (e.g. isRoot). The API marks the subject of each fetch as root, not
        // the original source node, so naively placing nodeElements first would
        // strip the yellow highlight from the source node when fetching its
        // neighbours. New elements whose IDs are not yet in the graph are
        // appended from nodeElements.
        const uniqueElements = uniqWith(
          [...elements, ...nodeElements],
          (a, b) => a.data.id === b.data.id
        );
        // Only update state when the merged result actually differs; avoids a
        // needless dagre re-layout and fitView animation when nothing changed.
        if (!isEqual(uniqueElements, elements)) {
          setElements(uniqueElements);
        }
        nodeDetails.current = { ...details, ...nodeDetails.current };
      }
    }
    setIsLoading(false);
  };

  const fetchAndSetElementsWrapper = async (params?: GetDataObjectParameter) => {
    const { analyticsId, id, modelId, type } = params ?? {};
    const treatAsRoot = id !== undefined;
    const idToUse = id ?? modelId ?? (analyticsId as string);

    await fetchAndSetElements(
      idToUse,
      treatAsRoot,
      modelId !== undefined && treatAsRoot === false ? JOB_MAP_NODE_TYPES.TRAINED_MODEL : type
    );

    // If related nodes had been fetched from any node then refetch
    if (Object.keys(usedAsRoot).length) {
      await asyncForEach(Object.keys(usedAsRoot), async (nodeId) => {
        await fetchAndSetElements(nodeId, true, usedAsRoot[nodeId]);
      });
    }
  };

  return {
    elements,
    error,
    fetchAndSetElementsWrapper,
    isLoading,
    message,
    nodeDetails: nodeDetails.current,
    setElements,
    setError,
  };
};
