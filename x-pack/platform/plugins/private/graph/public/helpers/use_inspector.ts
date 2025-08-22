/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import type {
  Start as InspectorPublicPluginStart,
  InspectorSession,
} from '@kbn/inspector-plugin/public';
import type { RequestAdapter } from '@kbn/inspector-common';

export const useInspector = ({
  inspect,
  requestAdapter,
}: {
  inspect: InspectorPublicPluginStart;
  requestAdapter: RequestAdapter;
}) => {
  const [inspectorSession, setInspectorSession] = useState<InspectorSession>();

  useEffect(() => {
    return () => {
      if (inspectorSession) {
        inspectorSession.close();
      }
    };
  }, [inspectorSession]);

  const onOpenInspector = useCallback(() => {
    const session = inspect.open({ requests: requestAdapter }, {});
    setInspectorSession(session);
  }, [inspect, requestAdapter]);

  return { onOpenInspector };
};
