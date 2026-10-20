/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { RuleApiResponse } from '../services/rules_api';
import { useComposeDiscoverFlyout } from '../hooks/use_compose_discover_flyout';

export interface ComposeTarget {
  mode: 'edit' | 'clone';
  rule: RuleApiResponse;
}

export const ComposeRuleFlyout = ({ target }: { target: ComposeTarget }) => {
  const { flyout, confirmationModal, openEditFlyout, openCloneFlyout } = useComposeDiscoverFlyout();

  useEffect(() => {
    if (target.mode === 'edit') {
      openEditFlyout(target.rule);
    } else {
      openCloneFlyout(target.rule);
    }
    // Opens once for the rule this was mounted with; a different rule remounts it by key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {flyout}
      {confirmationModal}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export default ComposeRuleFlyout;
