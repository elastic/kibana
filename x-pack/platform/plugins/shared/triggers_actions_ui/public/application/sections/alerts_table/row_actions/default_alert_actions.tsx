/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ViewRuleDetailsAlertAction } from './view_rule_details_alert_action';
import type { AlertActionsProps } from '../../../../types';
import { ViewAlertDetailsAlertAction } from './view_alert_details_alert_action';
import { MuteAlertAction } from './mute_alert_action';
import { MarkAsUntrackedAlertAction } from './mark_as_untracked_alert_action';
import { useLoadRuleTypesQuery } from '../../../hooks/use_load_rule_types_query';

/**
 * Common alerts table row actions
 */
export const DefaultAlertActions = (props: AlertActionsProps) => {
  const { authorizedToCreateAnyRules } = useLoadRuleTypesQuery({
    filteredRuleTypes: [],
  });

  return (
    <>
      <ViewRuleDetailsAlertAction {...props} />
      <ViewAlertDetailsAlertAction {...props} />
      {authorizedToCreateAnyRules && <MarkAsUntrackedAlertAction {...props} />}
      {authorizedToCreateAnyRules && <MuteAlertAction {...props} />}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { DefaultAlertActions as default };
