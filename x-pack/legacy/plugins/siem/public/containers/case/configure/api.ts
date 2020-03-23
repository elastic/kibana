/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import {
  CasesConnectorsFindResult,
  CasesConfigurePatch,
  CasesConfigureResponse,
  CasesConfigureRequest,
} from '../../../../../../../plugins/case/common/api';
import { KibanaServices } from '../../../lib/kibana';

import { CASES_CONFIGURE_URL } from '../constants';
import { ApiProps } from '../types';
import { convertToCamelCase, decodeCaseConfigureResponse } from '../utils';
import { CaseConfigure } from './types';

export const fetchConnectors = async ({ signal }: ApiProps): Promise<CasesConnectorsFindResult> => {
  const response = await KibanaServices.get().http.fetch(
    `${CASES_CONFIGURE_URL}/connectors/_find`,
    {
      method: 'GET',
      signal,
    }
  );

  return response;
};

export const getCaseConfigure = async ({ signal }: ApiProps): Promise<CaseConfigure | null> => {
  const response = await KibanaServices.get().http.fetch<CasesConfigureResponse>(
    CASES_CONFIGURE_URL,
    {
      method: 'GET',
      signal,
    }
  );

  return !isEmpty(response)
    ? convertToCamelCase<CasesConfigureResponse, CaseConfigure>(
        decodeCaseConfigureResponse(response)
      )
    : null;
};

export const postCaseConfigure = async (
  caseConfiguration: CasesConfigureRequest,
  signal: AbortSignal
): Promise<CaseConfigure> => {
  const response = await KibanaServices.get().http.fetch<CasesConfigureResponse>(
    CASES_CONFIGURE_URL,
    {
      method: 'POST',
      body: JSON.stringify(caseConfiguration),
      signal,
    }
  );
  return convertToCamelCase<CasesConfigureResponse, CaseConfigure>(
    decodeCaseConfigureResponse(response)
  );
};

export const patchCaseConfigure = async (
  caseConfiguration: CasesConfigurePatch,
  signal: AbortSignal
): Promise<CaseConfigure> => {
  const response = await KibanaServices.get().http.fetch<CasesConfigureResponse>(
    CASES_CONFIGURE_URL,
    {
      method: 'PATCH',
      body: JSON.stringify(caseConfiguration),
      signal,
    }
  );
  return convertToCamelCase<CasesConfigureResponse, CaseConfigure>(
    decodeCaseConfigureResponse(response)
  );
};
