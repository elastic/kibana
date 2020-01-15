/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState } from 'react';
import { EuiHorizontalRule } from '@elastic/eui';

import { CategorizationDetectors } from './metric_selection';
import { CategorizationDetectorsSummary } from './metric_selection_summary';
import { CategorizationSettings } from './settings';

interface Props {
  isActive: boolean;
  setCanProceed?: (proceed: boolean) => void;
}

export const CategorizationView: FC<Props> = ({ isActive, setCanProceed }) => {
  const [categoryFieldPercentValid, setCategoryFieldPercentValid] = useState(false);
  const [settingsValid, setSettingsValid] = useState(false);

  useEffect(() => {
    if (typeof setCanProceed === 'function') {
      setCanProceed(categoryFieldPercentValid && settingsValid);
    }
  }, [categoryFieldPercentValid, settingsValid]);

  return isActive === false ? (
    <CategorizationDetectorsSummary />
  ) : (
    <>
      <CategorizationDetectors setIsValid={setCategoryFieldPercentValid} />
      {categoryFieldPercentValid && (
        <>
          <EuiHorizontalRule margin="l" />
          <CategorizationSettings setIsValid={setSettingsValid} />
        </>
      )}
    </>
  );
};
