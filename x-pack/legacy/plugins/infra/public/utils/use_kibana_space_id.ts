/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import * as rt from 'io-ts';

import { useState, useEffect } from 'react';
import { start as spacesPluginStart } from '../../../spaces/public/legacy';
import { Space } from '../../../../../plugins/spaces/common/model/space';

export const useKibanaSpaceId = (): string => {
  const [activeSpace, setActiveSpace] = useState<undefined | Space>();

  useEffect(() => {
    spacesPluginStart.then(({ spacesManager }) => {
      if (spacesManager) {
        spacesManager.getActiveSpace().then(space => setActiveSpace(space));
      }
    });
  }, []);

  return pipe(
    activeSpaceRT.decode(activeSpace),
    fold(
      () => 'default',
      decodedActiveSpace => decodedActiveSpace.id
    )
  );
};

const activeSpaceRT = rt.type({
  id: rt.string,
});
