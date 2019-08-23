/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext, useMemo } from 'react';
import { EmbeddableContext } from '../context/EmbeddableContext';
import { IEmbeddable } from 'src/legacy/core_plugins/embeddable_api/public/np_ready/public';

export function useEmbeddable(embeddable: IEmbeddable<any, any>) {
  const embeddableProps = useContext(EmbeddableContext);
  return useMemo(
    () => ({
      embeddable,
      ...embeddableProps
    }),
    [embeddable]
  );
}
