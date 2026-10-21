/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { EsqlView } from '@kbn/esql-types';
import { i18n } from '@kbn/i18n';
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
  esqlViewName,
  getStartServices,
  getTelemetryClient,
}: {
  onClose: () => void;
  esqlViewName?: string;
  getStartServices: () => Promise<readonly [CoreStart, StartDependencies, ...unknown[]]>;
  getTelemetryClient: () => Promise<EsqlViewsTelemetryClient | undefined>;
}) => {
  const [ready, setReady] = useState<
    | {
        start: readonly [CoreStart, StartDependencies, ...unknown[]];
        telemetryClient?: EsqlViewsTelemetryClient;
        view?: EsqlView;
      }
    | undefined
  >();

  useEffect(() => {
    let cancelled = false;
    Promise.all([getStartServices(), getTelemetryClient()]).then(
      async ([start, telemetryClient]) => {
        if (cancelled) {
          return;
        }
        const [coreStart] = start;
        let view: EsqlView | undefined;
        if (esqlViewName) {
          try {
            view = await createEsqlViewsManagementClient(coreStart.http).getView(esqlViewName);
          } catch (error) {
            coreStart.notifications.toasts.addDanger(readViewError(error, esqlViewName));
            onClose();
            return;
          }
          if (!view) {
            coreStart.notifications.toasts.addDanger(readViewError(undefined, esqlViewName));
            onClose();
            return;
          }
        }
        if (!cancelled) {
          setReady({ start, telemetryClient, view });
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [esqlViewName, getStartServices, getTelemetryClient, onClose]);

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
        view={ready?.view}
        onSave={async () => {
          onClose();
        }}
        previewDependencies={formProps.previewDependencies}
        telemetryClient={formProps.telemetryClient}
      />
    </Suspense>
  );
};

const readViewError = (error: unknown, name: string): string => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return i18n.translate('xpack.esqlViews.createOverlay.viewNotFound', {
    defaultMessage: 'ES|QL view {name} could not be opened for editing.',
    values: { name },
  });
};
