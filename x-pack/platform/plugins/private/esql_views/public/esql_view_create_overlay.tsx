/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { createEsqlViewsManagementClient } from '@kbn/esql-utils';
import type { EsqlViewsTelemetryClient } from './telemetry';
import type { StartDependencies } from './plugin';

const EsqlViewForm = React.lazy(async () => {
  const { EsqlViewForm: Form } = await import('./esql_view_form');
  return { default: Form };
});

const LazyEsqlEditor = React.lazy(async () => {
  const { ESQLLangEditor } = await import('@kbn/esql/public');
  return { default: ESQLLangEditor };
});

/** ES|QL view create flyout hosted on the data management overview. */
export const EsqlViewCreateOverlay = ({
  onClose,
  getStartServices,
  getTelemetryClient,
}: {
  onClose: () => void;
  getStartServices: () => Promise<readonly [CoreStart, StartDependencies, ...unknown[]]>;
  getTelemetryClient: () => Promise<EsqlViewsTelemetryClient | undefined>;
}) => {
  const [ready, setReady] = useState<
    | {
        start: readonly [CoreStart, StartDependencies, ...unknown[]];
        telemetryClient?: EsqlViewsTelemetryClient;
      }
    | undefined
  >();

  useEffect(() => {
    let cancelled = false;
    Promise.all([getStartServices(), getTelemetryClient()]).then(([start, telemetryClient]) => {
      if (!cancelled) {
        setReady({ start, telemetryClient });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [getStartServices, getTelemetryClient]);

  const formProps = useMemo(() => {
    if (!ready) {
      return undefined;
    }
    const [coreStart, { data }] = ready.start;
    return {
      client: createEsqlViewsManagementClient(coreStart.http),
      previewDependencies: {
        dataViews: data.dataViews,
        http: coreStart.http,
        search: data.search.search,
      },
      telemetryClient: ready.telemetryClient,
    };
  }, [ready]);

  if (!formProps) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <EsqlViewForm
        EsqlEditor={LazyEsqlEditor}
        client={formProps.client}
        onClose={onClose}
        onSave={async () => {
          onClose();
        }}
        previewDependencies={formProps.previewDependencies}
        telemetryClient={formProps.telemetryClient}
      />
    </Suspense>
  );
};
