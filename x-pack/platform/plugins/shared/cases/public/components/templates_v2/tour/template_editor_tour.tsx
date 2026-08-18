/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useKibana } from '../../../common/lib/kibana';
import { useNewFeatureSeen } from '../../../common/use_new_feature_seen';
import { LOCAL_STORAGE_KEYS } from '../../../../common/constants';
import { GuidedTour } from '../../tour/guided_tour';
import { TEMPLATE_EDITOR_TOUR_STEPS, TEMPLATE_EDITOR_TOUR_STEP_TEST_ID } from './editor_tour_steps';

interface Props {
  /**
   * Gate the tour until the editor has finished loading. Starting before layout settles lets the
   * first step's popover disrupt the editor layout (e.g. pinning the validation-errors bar to the
   * top), so callers pass `false` while the page is still loading.
   */
  enabled?: boolean;
}

/**
 * Auto-firing guided tour for the template editor (create/edit). Runs once per browser the first
 * time the editor is opened, then persists a "seen" flag. Respects the global `hideAnnouncements`
 * opt-out.
 */
export const TemplateEditorTour: React.FC<Props> = ({ enabled = true }) => {
  const {
    services: { notifications },
  } = useKibana();
  const isTourEnabled = notifications.tours.isEnabled();

  const { isNew, markSeen } = useNewFeatureSeen(LOCAL_STORAGE_KEYS.templateEditorTourSeen);

  if (!isTourEnabled) {
    return null;
  }

  return (
    <GuidedTour
      steps={TEMPLATE_EDITOR_TOUR_STEPS}
      isActive={enabled && isNew}
      onFinish={markSeen}
      testIdPrefix={TEMPLATE_EDITOR_TOUR_STEP_TEST_ID}
    />
  );
};
TemplateEditorTour.displayName = 'TemplateEditorTour';
