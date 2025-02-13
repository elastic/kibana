/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';

import { usePostPushToService } from '../../containers/use_post_push_to_service';
import {
  getLicenseError,
  getKibanaConfigError,
  getConnectorMissingInfo,
  getDeletedConnectorError,
} from './helpers';
import type { CaseConnector } from '../../../common/types/domain';
import type { ErrorMessage } from './callout/types';
import { useRefreshCaseViewPage } from '../case_view/use_on_refresh_case_view_page';
import { useGetActionLicense } from '../../containers/use_get_action_license';
import { useCasesContext } from '../cases_context/use_cases_context';
import type { CaseConnectors } from '../../containers/types';

export interface UsePushToService {
  caseConnectors: CaseConnectors;
  caseId: string;
  caseStatus: string;
  connector: CaseConnector;
  isValidConnector: boolean;
}

export interface ReturnUsePushToService {
  errorsMsg: ErrorMessage[];
  hasBeenPushed: boolean;
  needsToBePushed: boolean;
  hasPushPermissions: boolean;
  isLoading: boolean;
  hasErrorMessages: boolean;
  hasLicenseError: boolean;
  handlePushToService: () => Promise<void>;
}

export const usePushToService = ({
  caseId,
  caseConnectors,
  connector,
  isValidConnector,
}: UsePushToService): ReturnUsePushToService => {
  const { permissions } = useCasesContext();
  const { isLoading, mutateAsync: pushCaseToExternalService } = usePostPushToService();
  const refreshCaseViewPage = useRefreshCaseViewPage();

  const { isLoading: isLoadingLicense, data: actionLicense = null } = useGetActionLicense();
  const hasLicenseError = actionLicense != null && !actionLicense.enabledInLicense;
  const needsToBePushed = !!caseConnectors[connector.id]?.push.needsToBePushed;
  const hasBeenPushed = !!caseConnectors[connector.id]?.push.hasBeenPushed;

  const handlePushToService = useCallback(async () => {
    if (connector.id != null && connector.id !== 'none') {
      const theCase = await pushCaseToExternalService({
        caseId,
        connector,
      });

      if (theCase != null) {
        refreshCaseViewPage();
      }
    }
  }, [caseId, connector, pushCaseToExternalService, refreshCaseViewPage]);

  const errorsMsg = useMemo(() => {
    const errors: ErrorMessage[] = [];

    // these message require that the user do some sort of write action as a result of the message, readonly users won't
    // be able to perform such an action so let's not display the error to the user in that situation
    if (!permissions.update) {
      return errors;
    }

    /**
     * We show only one message to the user depending the scenario. The messages have a priority of importance.
     * Messages with higher priority are being shown first. The priority is defined by the order each message is returned.
     *
     * By priority of importance:
     * 1. Show license error.
     * 2. Show configuration error.
     * 3. Show connector missing information if the connector is set to none.
     * 4. Show an error message if the connector has been deleted or the user does not have access to it.
     * 5. Show case closed message.
     */

    if (hasLicenseError) {
      return [getLicenseError()];
    }

    if (actionLicense != null && !actionLicense.enabledInConfig) {
      return [getKibanaConfigError()];
    }

    if (connector.id === 'none' && !isLoadingLicense && !hasLicenseError) {
      return [getConnectorMissingInfo()];
    }

    if (!isValidConnector && !isLoadingLicense && !hasLicenseError) {
      return [getDeletedConnectorError()];
    }

    return errors;
  }, [
    actionLicense,
    connector.id,
    hasLicenseError,
    isValidConnector,
    isLoadingLicense,
    permissions.update,
  ]);

  return {
    errorsMsg,
    hasErrorMessages: errorsMsg.length > 0,
    needsToBePushed,
    hasBeenPushed,
    isLoading: isLoading || isLoadingLicense,
    hasPushPermissions: permissions.push,
    hasLicenseError,
    handlePushToService,
  };
};
