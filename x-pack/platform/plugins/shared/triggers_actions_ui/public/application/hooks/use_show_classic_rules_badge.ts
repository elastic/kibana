/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useObservable from 'react-use/lib/useObservable';
import { shouldShowClassicRulesBadge } from '@kbn/alerting-v2-utils';
import { useKibana } from '../../common/lib/kibana';

/** Returns whether v1 rules UI should carry the "Classic" badge in the active solution. */
export const useShowClassicRulesBadge = (): boolean => {
  const { services } = useKibana();
  const { chrome } = services;
  const solutionNavId = useObservable(
    chrome.getActiveSolutionNavId$(),
    chrome.getActiveSolutionNavId()
  );

  return shouldShowClassicRulesBadge(services, solutionNavId);
};
