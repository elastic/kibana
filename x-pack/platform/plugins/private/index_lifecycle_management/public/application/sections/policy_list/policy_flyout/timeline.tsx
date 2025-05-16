/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { PolicyFromES } from '../../../../../common/types';
import { Timeline as ViewComponent } from '../../edit_policy/components/timeline/timeline';

export const Timeline = ({ policy }: { policy: PolicyFromES }) => {
  const hasDeletePhase = Boolean(policy.policy.phases.delete);
  const isUsingRollover = Boolean(policy.policy.phases.hot?.actions.rollover);
  const warmPhaseMinAge = policy.policy.phases.warm?.min_age;
  const coldPhaseMinAge = policy.policy.phases.cold?.min_age;
  const frozenPhaseMinAge = policy.policy.phases.frozen?.min_age;
  const deletePhaseMinAge = policy.policy.phases.delete?.min_age;
  return (
    <ViewComponent
      showTitle={false}
      hasDeletePhase={hasDeletePhase}
      isUsingRollover={isUsingRollover}
      hotPhaseMinAge={undefined}
      warmPhaseMinAge={warmPhaseMinAge}
      coldPhaseMinAge={coldPhaseMinAge}
      frozenPhaseMinAge={frozenPhaseMinAge}
      deletePhaseMinAge={deletePhaseMinAge}
    />
  );
};
