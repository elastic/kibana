/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { OnechatStartDependencies } from '../../types';

export const useSpaceId = () => {
  const { spaces } = useKibana<OnechatStartDependencies>().services;

  const [spaceId, setSpaceId] = useState<string>(DEFAULT_SPACE_ID);

  useEffect(() => {
    if (spaces) {
      spaces.getActiveSpace().then((space) => setSpaceId(space.id));
    }
  }, [spaces]);

  return spaceId;
};
