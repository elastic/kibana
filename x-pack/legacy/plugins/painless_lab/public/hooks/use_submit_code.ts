/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useRef, useCallback, useState } from 'react';
import { HttpSetup } from 'kibana/public';
import { debounce } from 'lodash';
import { Response } from '../common/types';
import { buildRequestPayload } from '../lib/helpers';
import { executeCode } from '../lib/execute_code';

const DEBOUNCE_MS = 800;

export const useSubmitCode = (http: HttpSetup) => {
  const currentRequestIdRef = useRef(0);
  const [response, setResponse] = useState<Response | undefined>(undefined);
  const [inProgress, setInProgress] = useState(false);

  const submit = useCallback(
    debounce(
      async (code: string, context: string, contextSetup: Record<string, any>) => {
        setInProgress(true);

        // Prevent an older request that resolves after a more recent request from clobbering it.
        // We store the resulting ID in this closure for comparison when the request resolves.
        const requestId = ++currentRequestIdRef.current;

        try {
          localStorage.setItem('painlessLabCode', code);
          localStorage.setItem('painlessLabContext', context);
          localStorage.setItem('painlessLabContextSetup', JSON.stringify(contextSetup));
          const result = await executeCode(http, buildRequestPayload(code, context, contextSetup));

          if (currentRequestIdRef.current === requestId) {
            setResponse(result);
            setInProgress(false);
          }
          // else ignore this response...
        } catch (error) {
          if (currentRequestIdRef.current === requestId) {
            setResponse({
              error,
            });
            setInProgress(false);
          }
          // else ignore this response...
        }
      },
      DEBOUNCE_MS,
      { trailing: true }
    ),
    [http]
  );

  return {
    response,
    inProgress,
    submit,
  };
};
