/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect, useContext } from 'react';

import { groupsData } from '../api';
import { Group } from '.././types';
import { hasMlUserPermissions } from '../../ml/permissions/has_ml_user_permissions';
import { MlCapabilitiesContext } from '../../ml/permissions/ml_capabilities_provider';
import { useStateToaster } from '../../toasters';
import { errorToToaster } from '../../ml/api/error_to_toaster';
import { useKibanaUiSetting } from '../../../lib/settings/use_kibana_ui_setting';
import { DEFAULT_KBN_VERSION } from '../../../../common/constants';

import * as i18n from './translations';

type Return = [boolean, string[]];

export const getSiemJobIdsFromGroupsData = (data: Group[]) =>
  data.reduce((jobIds: string[], group: Group) => {
    return group.id === 'siem' ? [...jobIds, ...group.jobIds] : jobIds;
  }, []);

export const useSiemJobs = (refetchData: boolean): Return => {
  const [siemJobs, setSiemJobs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const capabilities = useContext(MlCapabilitiesContext);
  const userPermissions = hasMlUserPermissions(capabilities);
  const [, dispatchToaster] = useStateToaster();
  const [kbnVersion] = useKibanaUiSetting(DEFAULT_KBN_VERSION);

  useEffect(() => {
    let isSubscribed = true;
    setLoading(true);

    async function fetchSiemJobIdsFromGroupsData() {
      if (userPermissions) {
        try {
          const data = await groupsData({
            'kbn-version': kbnVersion,
          });

          const siemJobIds = getSiemJobIdsFromGroupsData(data);
          if (isSubscribed) {
            setSiemJobs(siemJobIds);
          }
        } catch (error) {
          if (isSubscribed) {
            errorToToaster({ title: i18n.SIEM_JOB_FETCH_FAILURE, error, dispatchToaster });
          }
        }
      }
      if (isSubscribed) {
        setLoading(false);
      }
    }

    fetchSiemJobIdsFromGroupsData();
    return () => {
      isSubscribed = false;
    };
  }, [refetchData, userPermissions]);

  return [loading, siemJobs];
};
