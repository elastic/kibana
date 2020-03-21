/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useState, useMemo } from 'react';

import { useCaseConfigure } from '../../../../containers/case/configure/use_configure';
import { Case } from '../../../../containers/case/types';
import { useGetActionLicense } from '../../../../containers/case/use_get_action_license';
import { usePostPushToService } from '../../../../containers/case/use_post_push_to_service';

import * as i18n from './translations';
import { ErrorsPushServiceCallOut } from '../errors_push_service_callout';

interface UsePushToService {
  caseData: Case;
  isNew: boolean;
  updateCase: (newCase: Case) => void;
}

interface Connector {
  connectorId: string;
  connectorName: string;
}

interface ReturnUsePushToService {
  pushButton: JSX.Element;
  pushCallouts: JSX.Element | null;
}

export const usePushToService = ({
  caseData,
  updateCase,
  isNew,
}: UsePushToService): ReturnUsePushToService => {
  const [connector, setConnector] = useState<Connector | null>(null);

  const { isLoading, postPushToService } = usePostPushToService();

  const handleSetConnector = useCallback((connectorId: string, connectorName?: string) => {
    setConnector({ connectorId, connectorName: connectorName ?? '' });
  }, []);

  const { loading: loadingCaseConfigure } = useCaseConfigure({
    setConnectorId: handleSetConnector,
  });

  const { isLoading: loadingLicense, actionLicense } = useGetActionLicense();

  const handlePushToService = useCallback(() => {
    if (connector != null) {
      postPushToService({
        caseToPush: caseData,
        ...connector,
        updateCase,
      });
    }
  }, [caseData, connector, postPushToService, updateCase]);

  const errorsMsg = useMemo(() => {
    let errors: Array<{ title: string; description: string }> = [];
    if (caseData.status === 'closed') {
      errors = [
        ...errors,
        {
          title: i18n.PUSH_DISABLE_BECAUSE_CASE_CLOSED_TITLE,
          description: i18n.PUSH_DISABLE_BECAUSE_CASE_CLOSED_DESCRIPTION,
        },
      ];
    }
    if (connector == null && !loadingCaseConfigure && !loadingLicense) {
      errors = [
        ...errors,
        {
          title: i18n.PUSH_DISABLE_BY_NO_CASE_CONFIG_TITLE,
          description: i18n.PUSH_DISABLE_BY_NO_CASE_CONFIG_DESCRIPTION,
        },
      ];
    }
    if (actionLicense != null && !actionLicense.enabledInLicense) {
      errors = [
        ...errors,
        {
          title: i18n.PUSH_DISABLE_BY_LICENSE_TITLE,
          description: i18n.PUSH_DISABLE_BY_LICENSE_DESCRIPTION,
        },
      ];
    }
    if (actionLicense != null && !actionLicense.enabledInConfig) {
      errors = [
        ...errors,
        {
          title: i18n.PUSH_DISABLE_BY_KIBANA_CONFIG_TITLE,
          description: i18n.PUSH_DISABLE_BY_KIBANA_CONFIG_DESCRIPTION,
        },
      ];
    }
    return errors;
  }, [actionLicense, caseData, connector, loadingCaseConfigure, loadingLicense]);

  const pushToServiceButton = useMemo(
    () => (
      <EuiButton
        fill
        onClick={handlePushToService}
        disabled={isLoading || loadingLicense || loadingCaseConfigure || errorsMsg.length > 0}
        isLoading={isLoading}
      >
        {isNew ? i18n.PUSH_SERVICENOW : i18n.UPDATE_PUSH_SERVICENOW}
      </EuiButton>
    ),
    [isNew, handlePushToService, isLoading, loadingLicense, loadingCaseConfigure, errorsMsg]
  );

  const objToReturn = useMemo(
    () => ({
      pushButton:
        errorsMsg.length > 0 ? (
          <EuiToolTip
            position="top"
            title={errorsMsg[0].title}
            content={<p>{errorsMsg[0].description}</p>}
          >
            {pushToServiceButton}
          </EuiToolTip>
        ) : (
          <>{pushToServiceButton}</>
        ),
      pushCallouts: errorsMsg.length > 0 ? <ErrorsPushServiceCallOut errors={errorsMsg} /> : null,
    }),
    [errorsMsg, pushToServiceButton]
  );
  return objToReturn;
};
