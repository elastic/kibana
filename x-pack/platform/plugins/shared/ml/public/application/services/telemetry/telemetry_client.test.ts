/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { TelemetryClient } from './telemetry_client';
import { RULE_EDITOR_OPENED, type CustomRuleEditorOpenedEbtProps } from './types';

describe('TelemetryClient - custom rules', () => {
  let analyticsMock: ReturnType<typeof coreMock.createSetup>['analytics'];
  let telemetryClient: TelemetryClient;

  beforeEach(() => {
    const core = coreMock.createSetup();
    analyticsMock = core.analytics;
    telemetryClient = new TelemetryClient(analyticsMock);
  });

  describe('trackCustomRuleEditorOpened', () => {
    it('reports the correct event type and props', () => {
      const props: CustomRuleEditorOpenedEbtProps = {
        source: 'explorer_anomalies_table',
      };
      telemetryClient.trackCustomRuleEditorOpened(props);
      expect(analyticsMock.reportEvent).toHaveBeenCalledWith(RULE_EDITOR_OPENED, props);
    });

    it.each([
      ['explorer_single_metric_chart' as const],
      ['explorer_distribution_chart' as const],
      ['embeddable_single_metric_anomaly_chart' as const],
      ['embeddable_distribution_anomaly_chart' as const],
    ])('reports correctly for %s source', (source) => {
      const props: CustomRuleEditorOpenedEbtProps = { source };
      telemetryClient.trackCustomRuleEditorOpened(props);
      expect(analyticsMock.reportEvent).toHaveBeenCalledWith(RULE_EDITOR_OPENED, props);
    });

    it('reports correctly for single_metric_viewer_anomalies_table source', () => {
      const props: CustomRuleEditorOpenedEbtProps = {
        source: 'single_metric_viewer_anomalies_table',
      };
      telemetryClient.trackCustomRuleEditorOpened(props);
      expect(analyticsMock.reportEvent).toHaveBeenCalledWith(RULE_EDITOR_OPENED, props);
    });
  });
});
