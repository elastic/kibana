import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { VisTypeProvider } from './';

export function ReactVisTypeProvider(Private, getAppState, config) {
  const VisType = Private(VisTypeProvider);

  class ReactVisController {
    constructor(el, vis) {
      this.el = el;
      this.vis = vis;
    }

    render(visData, updateStatus) {
      this.visData = visData;

      return new Promise((resolve) => {
        const Component = this.vis.type.visConfig.component;
        render(<Component
          config={config}
          vis={this.vis}
          appState={getAppState()}
          visData={visData}
          renderComplete={resolve}
          updateStatus={updateStatus}
        />, this.el);
      });
    }

    destroy() {
      unmountComponentAtNode(this.el);
    }
  }

  class ReactVisType extends VisType {
    constructor(opts) {
      opts.visualization = ReactVisController;

      super(opts);

      if (!this.visConfig.component) {
        throw new Error('Missing component for ReactVisType');
      }
    }
  }

  return ReactVisType;
}
