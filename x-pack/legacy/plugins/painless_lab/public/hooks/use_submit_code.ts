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

const WAIT_MS = 800;

export const useSubmitCode = (http: HttpSetup) => {
  // .then off the same promise reference to enforce sequential
  // execution
  const promiseChainRef = useRef(Promise.resolve());
  const [response, setResponse] = useState<null | Response>(null);
  const [inProgress, setInProgress] = useState(false);

  const submit = useCallback(
    debounce(
      async (code: string, context: string, contextSetup: Record<string, any>) => {
        setInProgress(true);

        try {
          localStorage.setItem('painlessLabCode', code);
          localStorage.setItem('painlessLabContext', context);
          localStorage.setItem('painlessLabContextSetup', JSON.stringify(contextSetup));
          const result = await promiseChainRef.current.then(() =>
            executeCode(http, buildRequestPayload(code, context, contextSetup))
          );
          setResponse(result);
        } catch (error) {
          setResponse({
            result: undefined,
            error,
          });
        } finally {
          setInProgress(false);
        }
      },
      WAIT_MS,
      { trailing: true }
    ),
    []
  );

  return {
    response,
    inProgress,
    submit,
  };
};
