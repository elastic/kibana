/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';

import { EuiPanel } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import type { AnomalySourceDescriptor } from './anomaly_source';
import { AnomalyJobSelectorLazy } from './anomaly_job_selector_lazy';
import { LayerSelector } from './layer_selector';
import type { MlAnomalyLayersType } from './util';
import { ML_ANOMALY_LAYERS } from './util';
import type { MlApi } from '../application/services/ml_api_service';

interface Props {
  onSourceConfigChange: (sourceConfig: Partial<AnomalySourceDescriptor> | null) => void;
  coreStart: CoreStart;
  jobsManagementPath?: string;
  canCreateJobs: boolean;
}

interface State {
  jobId?: string;
  typicalActual?: MlAnomalyLayersType;
}

export class CreateAnomalySourceEditor extends Component<Props, State> {
  private _mlJobsService: MlApi['jobs'] | undefined;
  private _isMounted: boolean = false;
  state: State = {};

  private configChange() {
    if (this.state.jobId) {
      this.props.onSourceConfigChange({
        jobId: this.state.jobId,
        typicalActual: this.state.typicalActual || ML_ANOMALY_LAYERS.ACTUAL,
      });
    }
  }

  componentDidMount(): void {
    if (!this._mlJobsService) {
      const that = this;

      async function initializeMlJobsService() {
        const { HttpService } = await import('../application/services/http_service');
        const { jobsApiProvider } = await import('../application/services/ml_api_service/jobs');

        const httpService = new HttpService(that.props.coreStart.http);
        that._mlJobsService = jobsApiProvider(httpService);
        that.render();
      }

      initializeMlJobsService();
    }

    this._isMounted = true;
  }

  private onTypicalActualChange = (typicalActual: MlAnomalyLayersType) => {
    if (!this._isMounted) {
      return;
    }
    this.setState(
      {
        typicalActual,
      },
      () => {
        this.configChange();
      }
    );
  };

  private previewLayer = (jobId: string) => {
    if (!this._isMounted) {
      return;
    }
    this.setState(
      {
        jobId,
      },
      () => {
        this.configChange();
      }
    );
  };

  render() {
    if (!this._mlJobsService) {
      return null;
    }

    const selector = this.state.jobId ? (
      <LayerSelector
        onChange={this.onTypicalActualChange}
        typicalActual={this.state.typicalActual || ML_ANOMALY_LAYERS.ACTUAL}
      />
    ) : null;

    return (
      <EuiPanel>
        <AnomalyJobSelectorLazy
          onJobChange={this.previewLayer}
          mlJobsService={this._mlJobsService}
          jobsManagementPath={this.props.jobsManagementPath}
          canCreateJobs={this.props.canCreateJobs}
        />
        {selector}
      </EuiPanel>
    );
  }
}

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default CreateAnomalySourceEditor;
