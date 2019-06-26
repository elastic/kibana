/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect, useContext } from 'react';
import { groupsData } from '../api';
import { Group } from '.././types';
import {
  AppKibanaFrameworkAdapter,
  KibanaConfigContext,
} from '../../../lib/adapters/framework/kibana_framework_adapter';

type Return = [boolean, Group[] | []];

export const useGroupData = (refetchData: boolean): Return => {
  const [groupData, setGroupData] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const config: Partial<AppKibanaFrameworkAdapter> = useContext(KibanaConfigContext);

  const fetchFunc = async () => {
    const data = await groupsData({
      'kbn-version': config.kbnVersion,
    });
    setGroupData(data);
    setLoading(false);
  };

  useEffect(
    () => {
      setLoading(true);
      fetchFunc();
    },
    [refetchData]
  );

  return [loading, groupData];
};
