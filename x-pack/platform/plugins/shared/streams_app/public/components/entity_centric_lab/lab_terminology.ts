/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useObservable from 'react-use/lib/useObservable';
import { useKibana } from '../../hooks/use_kibana';

/**
 * ElasticOn copy uses "resource(s)" in place of "entity/entities". Latest and
 * entity-centric keep the original nouns. Interpolate these into i18n
 * `defaultMessage`s rather than duplicating every string.
 */
export const labThing = (isElasticOn: boolean): string => (isElasticOn ? 'resource' : 'entity');

export const labThings = (isElasticOn: boolean): string => (isElasticOn ? 'resources' : 'entities');

export const labThingLabel = (isElasticOn: boolean): string =>
  isElasticOn ? 'Resource' : 'Entity';

export const labThingsLabel = (isElasticOn: boolean): string =>
  isElasticOn ? 'Resources' : 'Entities';

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
