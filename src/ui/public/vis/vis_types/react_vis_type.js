import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { VisTypeProvider } from 'ui/vis/vis_types';

export function ReactVisTypeProvider(Private) {
  const VisType = Private(VisTypeProvider);

  class ReactVisController {
    constructor(el, vis) {
      this.el = el;
      this.vis = vis;
    }

    render(visData) {
      this.visData = visData;

      return new Promise((resolve) => {
        const Component = this.vis.type.visConfig.component;
        render(<Component vis={this.vis} visData={visData} renderComplete={resolve} />, this.el);
      });
    }

    resize() {
      if (this.visData) {
        this.render(this.visData);
      }
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
