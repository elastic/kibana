/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef } from 'react';

import { TOURS, useTourQueue } from '@kbn/tour-queue';

import {
  SolutionViewSwitchTourComponent,
  type SolutionViewSwitchTourComponentProps,
} from './solution_view_switch_tour_component';

export type SolutionViewSwitchTourProps = Omit<SolutionViewSwitchTourComponentProps, 'isOpen'>;

export const SolutionViewSwitchTour = (tourProps: SolutionViewSwitchTourProps) => {
  // Only register tour once eligibility has been confirmed
  const { isActive: isActiveInQueue, onComplete } = useTourQueue(TOURS.SPACES_SOLUTION_VIEW_SWITCH);

  const onActiveTourRef = useRef(false);
  const onFinishTourRef = useRef(tourProps.onFinish);

  // Track latest onFinish callback for cleanup
  useEffect(() => {
    onFinishTourRef.current = tourProps.onFinish;
  }, [tourProps.onFinish]);

  // Track whether the tour has been shown
  useEffect(() => {
    if (isActiveInQueue) onActiveTourRef.current = true;
  }, [isActiveInQueue]);

  // Mark tour as completed when component unmounts (clicking away or closing the tour)
  useEffect(() => {
    return () => {
      if (onActiveTourRef.current) {
        onFinishTourRef.current();
      }
    };
  }, []);

  const onFinish = useCallback(() => {
    tourProps.onFinish();
    onComplete();
  }, [tourProps, onComplete]);

  const onClickSpaceSettings = useCallback(() => {
    tourProps.onClickSpaceSettings();
    onComplete();
  }, [tourProps, onComplete]);

  return (
    <SolutionViewSwitchTourComponent
      {...tourProps}
      isOpen={isActiveInQueue}
      onFinish={onFinish}
      onClickSpaceSettings={onClickSpaceSettings}
    />
  );
};
