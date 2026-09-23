/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiButton, EuiCallOut, EuiSpacer } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { SAMPLE_DATA_INDEX, SAMPLE_DATA_SET_ID } from '../../common/constants';

interface SampleDataStatus {
  checked: boolean;
  installed: boolean;
}

/**
 * The bundled templates all query the logs sample data set. Without it every
 * panel would render an empty chart and look broken, so check once and say
 * plainly what is missing.
 */
export function useSampleDataStatus(core: CoreStart): SampleDataStatus {
  const [status, setStatus] = useState<SampleDataStatus>({ checked: false, installed: true });

  useEffect(() => {
    let cancelled = false;
    core.http
      .get<Array<{ id: string; status: string }>>('/api/sample_data')
      .then((sets) => {
        if (cancelled) return;
        const logs = sets.find((set) => set.id === SAMPLE_DATA_SET_ID);
        setStatus({ checked: true, installed: logs?.status === 'installed' });
      })
      .catch(() => {
        // The status endpoint is best effort; assume installed rather than
        // showing a misleading warning.
        if (!cancelled) setStatus({ checked: true, installed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [core]);

  return status;
}

export function SampleDataCallout({ core }: { core: CoreStart }) {
  const { checked, installed } = useSampleDataStatus(core);
  if (!checked || installed) return null;

  const href = core.http.basePath.prepend('/app/home#/tutorial_directory/sampleData');

  return (
    <>
      <EuiCallOut
        announceOnMount
        color="warning"
        iconType="questionInCircle"
        title="The sample logs data is not installed"
      >
        <p>
          The bundled example apps query <code>{SAMPLE_DATA_INDEX}</code> with ES|QL. Add the
          &ldquo;Sample web logs&rdquo; data set and reload this page to see them with data.
        </p>
        <EuiButton href={href} color="warning" fill iconType="plusInCircle">
          Install sample data
        </EuiButton>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
}
