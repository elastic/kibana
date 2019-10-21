/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useState } from 'react';
import { useLibs } from '../../../hooks/use_libs';

export function useUnenroll(refreshAgent: () => Promise<void>, agentId: string) {
  const { agents } = useLibs();
  const [state, setState] = useState<
    | {
        confirm: false;
        loading: false;
      }
    | {
        confirm: true;
        loading: false;
      }
    | {
        confirm: false;
        loading: true;
      }
  >({
    confirm: false,
    loading: false,
  });

  return {
    state,
    showConfirmModal: () =>
      setState({
        confirm: true,
        loading: false,
      }),
    confirmUnenrollement: async () => {
      setState({
        confirm: false,
        loading: true,
      });

      await agents.unenroll([agentId]);

      setState({
        confirm: false,
        loading: false,
      });
      refreshAgent();
    },
    clear: () => {
      setState({
        confirm: false,
        loading: false,
      });
    },
  };
}
