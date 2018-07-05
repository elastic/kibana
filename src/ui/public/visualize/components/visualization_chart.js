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
        dispatchRenderStart(this.chartDiv.current);
      }),
      filter(({ vis, visData, container }) => vis && vis.initialized && container && (!vis.type.requiresSearch || visData)),
      debounceTime(100),
      switchMap(async ({ vis, visData, container }) => {
        vis.size = [container.clientWidth, container.clientHeight];
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
        dispatchRenderComplete(this.chartDiv.current);
      });

    this.chartDiv = React.createRef();
    this.containerDiv = React.createRef();
  }

  render() {
    return (
      <div className="vis-container" tabIndex="0" ref={this.containerDiv}>
        <span className="kuiScreenReaderOnly">
          {this.props.vis.type.title} visualization, not yet accessible
        </span>
        <div
          aria-hidden={!this.props.vis.type.isAccessible}
          className="visualize-chart"
          ref={this.chartDiv}
        />
      </div>
    );
  }

  _startRenderVisualization = () => {
    this._observer.next({
      vis: this.props.vis,
      visData: this.props.visData,
      container: this.containerDiv.current
    });
  };

  componentDidMount() {
    const { vis, listenOnChange } = this.props;
    const Visualization = vis.type.visualization;

    this.visualization = new Visualization(this.chartDiv.current, vis);

    if (this.visualization.isLoaded) {
      this.visualization.isLoaded().then(() => {
        vis.initialized = true;
      });
    } else {
      vis.initialized = true;
    }

    if (listenOnChange) {
      this.resizeChecker = new ResizeChecker(this.containerDiv.current);
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
