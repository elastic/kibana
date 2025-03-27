/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, screen } from '@testing-library/react';
import { OBSERVABILITY_OWNER } from '../../../../common/constants';
import { alertCommentWithIndices, basicCase } from '../../../containers/mock';
import type { CaseUI } from '../../../../common';
import { CaseViewAlerts } from './case_view_alerts';
import * as api from '../../../containers/api';
import type { FeatureIdsResponse } from '../../../containers/types';
import { SECURITY_SOLUTION_RULE_TYPE_IDS } from '@kbn/securitysolution-rules';
import { renderWithTestingProviders } from '../../../common/mock';

jest.mock('../../../containers/api');

const caseData: CaseUI = {
  ...basicCase,
  comments: [...basicCase.comments, alertCommentWithIndices],
};

const getAlertsStateTableMock = jest.fn().mockReturnValue(<div data-test-subj="alerts-table" />);
const getAlertConfigIdPerRuleTypesMock = jest
  .fn()
  .mockReturnValue('case-details-alerts-observability');

describe('CaseUI View Page activity tab', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the alerts table', async () => {
    renderWithTestingProviders(<CaseViewAlerts caseData={caseData} />, {
      wrapperProps: {
        services: {
          triggersActionsUi: {
            getAlertsStateTable: getAlertsStateTableMock,
            // @ts-expect-error: not all services are required
            alertsTableConfigurationRegistry: {
              getAlertConfigIdPerRuleTypes: getAlertConfigIdPerRuleTypesMock,
            },
          },
        },
      },
    });

    expect(await screen.findByTestId('alerts-table')).toBeInTheDocument();
  });

  it('should call the alerts table with correct props for security solution', async () => {
    renderWithTestingProviders(<CaseViewAlerts caseData={caseData} />, {
      wrapperProps: {
        services: {
          triggersActionsUi: {
            getAlertsStateTable: getAlertsStateTableMock,
            // @ts-expect-error: not all services are required
            alertsTableConfigurationRegistry: {
              getAlertConfigIdPerRuleTypes: getAlertConfigIdPerRuleTypesMock,
            },
          },
        },
      },
    });

    await waitFor(async () => {
      expect(getAlertsStateTableMock).toHaveBeenCalledWith({
        alertsTableConfigurationRegistry: expect.anything(),
        configurationId: 'securitySolution-case',
        ruleTypeIds: SECURITY_SOLUTION_RULE_TYPE_IDS,
        id: 'case-details-alerts-securitySolution',
        query: {
          ids: {
            values: ['alert-id-1'],
          },
        },
        showAlertStatusWithFlapping: false,
      });
    });
  });

  it('should call the alerts table with correct props for observability', async () => {
    const getFeatureIdsMock = jest.spyOn(api, 'getFeatureIds');
    getFeatureIdsMock.mockResolvedValueOnce({
      aggregations: {
        consumer: { buckets: [{ doc_count: 1, key: 'observability' }] },
        producer: { buckets: [] },
        ruleTypeIds: { buckets: [{ doc_count: 1, key: 'log-threshold' }] },
      },
    } as unknown as FeatureIdsResponse);

    renderWithTestingProviders(
      <CaseViewAlerts
        caseData={{
          ...caseData,
          owner: OBSERVABILITY_OWNER,
        }}
      />,
      {
        wrapperProps: {
          services: {
            triggersActionsUi: {
              getAlertsStateTable: getAlertsStateTableMock,
              // @ts-expect-error: not all services are required
              alertsTableConfigurationRegistry: {
                getAlertConfigIdPerRuleTypes: getAlertConfigIdPerRuleTypesMock,
              },
            },
          },
        },
      }
    );

    await waitFor(async () => {
      expect(getAlertsStateTableMock).toHaveBeenCalledWith({
        alertsTableConfigurationRegistry: expect.anything(),
        configurationId: 'case-details-alerts-observability',
        ruleTypeIds: ['log-threshold'],
        consumers: ['observability'],
        id: 'case-details-alerts-observability',
        query: {
          ids: {
            values: ['alert-id-1'],
          },
        },
        showAlertStatusWithFlapping: true,
      });
    });
  });

  it('should call the getFeatureIds with the correct alert ID', async () => {
    const getFeatureIdsMock = jest.spyOn(api, 'getFeatureIds');
    renderWithTestingProviders(
      <CaseViewAlerts
        caseData={{
          ...caseData,
          owner: OBSERVABILITY_OWNER,
        }}
      />,
      {
        wrapperProps: {
          services: {
            triggersActionsUi: {
              getAlertsStateTable: getAlertsStateTableMock,
              // @ts-expect-error: not all services are required
              alertsTableConfigurationRegistry: {
                getAlertConfigIdPerRuleTypes: getAlertConfigIdPerRuleTypesMock,
              },
            },
          },
        },
      }
    );

    await waitFor(async () => {
      expect(getFeatureIdsMock).toHaveBeenCalledWith({
        query: {
          ids: {
            values: ['alert-id-1'],
          },
        },
        signal: expect.anything(),
      });
    });
  });

  it('should show an empty prompt when the cases has no alerts', async () => {
    renderWithTestingProviders(
      <CaseViewAlerts
        caseData={{
          ...caseData,
          comments: [],
        }}
      />,
      {
        wrapperProps: {
          services: {
            triggersActionsUi: {
              getAlertsStateTable: getAlertsStateTableMock,
              // @ts-expect-error: not all services are required
              alertsTableConfigurationRegistry: {
                getAlertConfigIdPerRuleTypes: getAlertConfigIdPerRuleTypesMock,
              },
            },
          },
        },
      }
    );

    expect(await screen.findByTestId('caseViewAlertsEmpty')).toBeInTheDocument();
  });
});
