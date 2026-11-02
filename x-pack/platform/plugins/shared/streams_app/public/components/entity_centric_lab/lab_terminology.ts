/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useObservable from 'react-use/lib/useObservable';
import { useKibana } from '../../hooks/use_kibana';

/**
 * Inventory copy uses "entity/entities". The `isElasticOn` / `resourceCopy`
 * flags are kept for call-site compatibility but no longer switch nouns.
 */
export const labThing = (_isElasticOn: boolean): string => 'entity';

export const labThings = (_isElasticOn: boolean): string => 'entities';

export const labThingLabel = (_isElasticOn: boolean): string => 'Entity';

export const labThingsLabel = (_isElasticOn: boolean): string => 'Entities';

export const useIsElasticOn = (): boolean => {
  const {
    core: { uiSettings },
  } = useKibana();
  const labMode = useObservable(
    uiSettings.get$<string>('discover:labMode', 'off'),
    uiSettings.get<string>('discover:labMode', 'off')
  );
  return labMode === 'elasticOn';
};
