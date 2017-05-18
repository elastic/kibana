import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { VisTypeProvider } from 'ui/vis/vis_types';

export function ReactVisTypeProvider(Private) {
  const VisType = Private(VisTypeProvider);

  class ReactVisController {
    constructor(el) {
      this.el = el[0];
    }

    render(vis, visData) {
      this.vis = vis;
      this.visData = visData;

      return new Promise((resolve) => {
        const Component = vis.type.visConfig.component;
        render(<Component vis={vis} visData={visData} renderComplete={resolve} />, this.el);
      });
    }

    resize() {
      this.render(this.vis, this.visData);
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
