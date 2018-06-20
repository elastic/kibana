/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import $ from 'jquery';
import React, { Component } from 'react';
import * as Rx from 'rxjs';
import { tap, debounceTime, filter, share, switchMap } from 'rxjs/operators';
import { ResizeChecker } from 'ui/resize_checker';
import { getUpdateStatus } from 'ui/vis/update_status';
import { dispatchRenderComplete, dispatchRenderStart } from 'ui/render_complete';

export class VisualizationChart extends Component {
  constructor(props) {
    super(props);

    const render$ = Rx.Observable.create(observer => {
      this._observer = observer;
    }).pipe(
      share()
    );

    const success$ = render$.pipe(
      tap(() => {
        dispatchRenderStart(this.chartDiv);
      }),
      filter(({ vis, visData, container }) => vis && vis.initialized && container && (!vis.type.requiresSearch || visData)),
      debounceTime(100),
      switchMap(async ({ vis, visData, container }) => {
        vis.size = [container.width(), container.height()];
        const status = getUpdateStatus(vis.type.requiresUpdateStatus, this, this.props);
        const renderPromise = this.visualization.render(visData, status);
        return renderPromise;
      })
    );

    const requestError$ = render$.pipe(
      filter(({ vis }) => vis.requestError)
    );

    this.renderSubscription = Rx.merge(success$, requestError$)
      .subscribe(() => {
        dispatchRenderComplete(this.chartDiv);
      });

  }

  render() {
    return (
      <div className="vis-container" tabIndex="0" ref={c => this.containerDiv = c}>
        <span className="kuiScreenReaderOnly">
          {this.props.vis.type.title} visualization, not yet accessible
        </span>
        <div
          aria-hidden={!this.props.vis.type.isAccessible}
          className="visualize-chart"
          ref={c => this.chartDiv = c}
        />
      </div>
    );
  }

  _startRenderVisualization = () => {
    this._observer.next({
      vis: this.props.vis,
      visData: this.props.visData,
      container: $(this.containerDiv)
    });
  };

  componentDidMount() {
    const Visualization = this.props.vis.type.visualization;
    this.visualization = new Visualization(this.chartDiv, this.props.vis);

    if (this.props.listenOnChange) {
      this.resizeChecker = new ResizeChecker(this.containerDiv);
      this.resizeChecker.on('resize', this._startRenderVisualization);
    }

    this._startRenderVisualization();
  }

  componentDidUpdate() {
    this._startRenderVisualization();
  }

  componentWillUnmount() {
    if (this.renderSubscription) this.renderSubscription.unsubscribe();
    if (this.resizeChecker) this.resizeChecker.destroy();
    if (this.visualization) this.visualization.destroy();
  }
}
