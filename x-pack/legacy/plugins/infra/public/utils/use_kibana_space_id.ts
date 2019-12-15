/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import * as rt from 'io-ts';

import { useKibanaInjectedVar } from './use_kibana_injected_var';

export const useKibanaSpaceId = (): string => {
  const activeSpace = useKibanaInjectedVar('activeSpace');

  return pipe(
    activeSpaceRT.decode(activeSpace),
    fold(
      () => 'default',
      decodedActiveSpace => decodedActiveSpace.space.id
    )
  );
};

const activeSpaceRT = rt.type({
  space: rt.type({
    id: rt.string,
  }),
});
