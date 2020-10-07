/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHorizontalRule } from '@elastic/eui';
import React from 'react';
import { Section } from '../../components/section/section';
import { SampleMlJob, SampleApp1ClickContext } from '../../triggers';
import { DrilldownsWithoutEmbeddableExample } from '../drilldowns_without_embeddable_example';
import { DrilldownsWithoutEmbeddableSingleButtonExample } from '../drilldowns_without_embeddable_single_button_example/drilldowns_without_embeddable_single_button_example';
import { DrilldownsWithEmbeddableExample } from '../drilldowns_with_embeddable_example';

export const job: SampleMlJob = {
  job_id: '123',
  job_type: 'anomaly_detector',
  description: 'This is some ML job.',
};

export const context: SampleApp1ClickContext = { job };

export const DrilldownsManager: React.FC = () => {
  return (
    <div>
      <Section title={'Drilldowns Manager'}>
        <DrilldownsWithoutEmbeddableExample />

        <EuiHorizontalRule margin="xxl" />

        <DrilldownsWithoutEmbeddableSingleButtonExample />

        <EuiHorizontalRule margin="xxl" />

        <DrilldownsWithEmbeddableExample />
      </Section>
    </div>
  );
};
