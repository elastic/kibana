/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect, useContext } from 'react';
import { groupsData } from '../api';
import { Group } from '.././types';
import { KibanaConfigContext } from '../../../lib/adapters/framework/kibana_framework_adapter';
import { hasMlUserPermissions } from '../../ml/permissions/has_ml_user_permissions';
import { MlCapabilitiesContext } from '../../ml/permissions/ml_capabilities_provider';
import { useStateToaster } from '../../toasters';
import { errorToToaster } from '../../ml/api/error_to_toaster';

type Return = [boolean, string[]];

export const getSiemJobIdsFromGroupsData = (data: Group[]) =>
  data.reduce((jobIds: string[], group: Group) => {
    return group.id === 'siem' ? [...jobIds, ...group.jobIds] : jobIds;
  }, []);

export const useSiemJobs = (refetchData: boolean): Return => {
  const [siemJobs, setSiemJobs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const config = useContext(KibanaConfigContext);
  const capabilities = useContext(MlCapabilitiesContext);
  const userPermissions = hasMlUserPermissions(capabilities);
  const [, dispatchToaster] = useStateToaster();

  const fetchFunc = async () => {
    if (userPermissions) {
      try {
        const data = await groupsData({
          'kbn-version': config.kbnVersion,
        });

        const siemJobIds = getSiemJobIdsFromGroupsData(data);

        setSiemJobs(siemJobIds);
      } catch (error) {
        errorToToaster({ error, dispatchToaster });
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchFunc();
  }, [refetchData, userPermissions]);

  return [loading, siemJobs];
};
