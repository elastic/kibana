/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTourStep } from '@elastic/eui';
import React, { useCallback, useEffect, useState } from 'react';
import { throttle } from 'lodash';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { Conversation } from '../../assistant_context/types';
import { NEW_FEATURES_TOUR_STORAGE_KEYS } from '../const';
import { anonymizedValuesAndCitationsTourStep1 } from './step_config';
import type { TourState } from '../knowledge_base';
import {
  conversationContainsAnonymizedValues,
  conversationContainsContentReferences,
} from '../../assistant/conversations/utils';
import { useTourStorageKey } from '../common/hooks/use_tour_storage_key';

interface Props {
  conversation: Conversation | undefined;
}

// Throttles reads from local storage to 1 every 5 seconds.
// This is to prevent excessive reading from local storage. It acts
// as a cache.
const getKnowledgeBaseTourStateThrottled = throttle((tourStorageKey) => {
  const value = localStorage.getItem(tourStorageKey);
  if (value) {
    return JSON.parse(value) as TourState;
  }
  return undefined;
}, 5000);

export const AnonymizedValuesAndCitationsTour: React.FC<Props> = ({ conversation }) => {
  const kbTourStorageKey = useTourStorageKey(NEW_FEATURES_TOUR_STORAGE_KEYS.KNOWLEDGE_BASE);

  const tourStorageKey = useTourStorageKey(
    NEW_FEATURES_TOUR_STORAGE_KEYS.ANONYMIZED_VALUES_AND_CITATIONS
  );
  const [tourCompleted, setTourCompleted] = useLocalStorage<boolean>(tourStorageKey, false);

  const [showTour, setShowTour] = useState(false);

  const { notifications } = useKibana().services;
  const isTourEnabled = notifications?.tours.isEnabled() ?? true;

  useEffect(() => {
    if (showTour || !conversation || tourCompleted || !isTourEnabled) {
      return;
    }

    const knowledgeBaseTourState = getKnowledgeBaseTourStateThrottled(kbTourStorageKey);

    // If the knowledge base tour is active on this page (i.e. step 1), don't show this tour to prevent overlap.
    if (knowledgeBaseTourState?.isTourActive && knowledgeBaseTourState?.currentTourStep === 1) {
      return;
    }

    const containsContentReferences = conversationContainsContentReferences(conversation);
    const containsAnonymizedValues = conversationContainsAnonymizedValues(conversation);

    if (containsContentReferences || containsAnonymizedValues) {
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 1000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [conversation, tourCompleted, showTour, kbTourStorageKey, isTourEnabled]);

  const finishTour = useCallback(() => {
    setTourCompleted(true);
    setShowTour(false);
  }, [setTourCompleted, setShowTour]);

  return (
    <EuiTourStep
      data-test-subj="anonymizedValuesAndCitationsTourStep"
      panelProps={{
        'data-test-subj': `anonymizedValuesAndCitationsTourStepPanel`,
      }}
      anchor={anonymizedValuesAndCitationsTourStep1.anchor}
      content={anonymizedValuesAndCitationsTourStep1.content}
      isStepOpen={showTour}
      maxWidth={300}
      onFinish={finishTour}
      step={1}
      stepsTotal={1}
      title={anonymizedValuesAndCitationsTourStep1.title}
      subtitle={anonymizedValuesAndCitationsTourStep1.subTitle}
      anchorPosition="rightUp"
    />
  );
};
