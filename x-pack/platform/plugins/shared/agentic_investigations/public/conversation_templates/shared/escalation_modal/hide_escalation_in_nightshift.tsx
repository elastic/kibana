/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

/**
 * Nightshift app id (`@kbn/deeplinks-observability`). Kept local so this shared plugin does not
 * depend on an Observability deeplink package for a single string.
 */
export const NIGHTSHIFT_APP_ID_FOR_ESCALATION_HIDE = 'nightshift';

/**
 * Hides the investigation flyout "Open an escalation" control while the user is in Nightshift
 * (elastic/nightshift-program#2168). Alert Zero and other hosts keep the button.
 */
export const HideEscalationInNightshift = ({ children }: React.PropsWithChildren) => {
  const {
    services: { application },
  } = useKibana<CoreStart>();
  const appId = useObservable(application.currentAppId$, undefined);

  if (appId === NIGHTSHIFT_APP_ID_FOR_ESCALATION_HIDE) {
    return null;
  }

  return <>{children}</>;
};
