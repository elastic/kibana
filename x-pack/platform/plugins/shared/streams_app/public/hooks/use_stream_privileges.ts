/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STREAMS_UI_PRIVILEGES } from '@kbn/streams-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import type { ILicense } from '@kbn/licensing-plugin/public';
import { useKibana } from './use_kibana';

export function useStreamPrivileges(): {
  ui: { manage: boolean; show: boolean };
  license: ILicense | undefined;
} {
  const {
    core: {
      application: {
        capabilities: { streams },
      },
    },
    dependencies: {
      start: { licensing },
    },
  } = useKibana();

  const license = useObservable(licensing.license$);

  return {
    ui: streams as {
      [STREAMS_UI_PRIVILEGES.manage]: boolean;
      [STREAMS_UI_PRIVILEGES.show]: boolean;
    },
    license,
  };
}
