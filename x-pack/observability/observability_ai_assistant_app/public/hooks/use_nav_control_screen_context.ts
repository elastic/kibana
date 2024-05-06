/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import datemath from '@elastic/datemath';
import moment from 'moment';
import { useKibana } from './use_kibana';
import { useObservabilityAIAssistantAppService } from './use_observability_ai_assistant_app_service';

export function useNavControlScreenContext() {
  const service = useObservabilityAIAssistantAppService();

  const {
    services: {
      plugins: {
        start: { data },
      },
    },
  } = useKibana();

  const { from, to } = data.query.timefilter.timefilter.getTime();

  const [href, setHref] = useState(window.location.href);

  useEffect(() => {
    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    let unmounted: boolean = false;

    function updateHref() {
      if (!unmounted) {
        setHref(window.location.href);
      }
    }

    window.history.pushState = (...args: Parameters<typeof originalPushState>) => {
      originalPushState(...args);
      updateHref();
    };

    window.history.replaceState = (...args: Parameters<typeof originalReplaceState>) => {
      originalReplaceState(...args);
      updateHref();
    };
    window.addEventListener('popstate', updateHref);

    window.addEventListener('hashchange', updateHref);

    return () => {
      unmounted = true;
      window.removeEventListener('popstate', updateHref);
      window.removeEventListener('hashchange', updateHref);
    };
  }, []);

  useEffect(() => {
    const start = datemath.parse(from)?.format() ?? moment().subtract(1, 'day').toISOString();
    const end = datemath.parse(to)?.format() ?? moment().toISOString();

    return service.setScreenContext({
      screenDescription: `The user is looking at ${href}. The current time range is ${start} - ${end}.`,
    });
  }, [service, from, to, href]);
}
