/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ReactDOM from 'react-dom';
import React from 'react';
import { EuiIcon } from '@elastic/eui';
import { Error } from '../../../public/components/error';
import { Popover } from '../../../public/components/popover';

export const error = () => ({
  name: 'error',
  displayName: 'Error information',
  help: 'Render error data in a way that is helpful to users',
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const draw = () => {
      const buttonSize = Math.min(domNode.clientHeight, domNode.clientWidth);
      const button = handleClick => (
        <EuiIcon
          className="canvasRenderError__icon"
          onClick={handleClick}
          style={{
            height: buttonSize,
            width: buttonSize,
          }}
          type="alert"
        />
      );

      ReactDOM.render(
        <div className="canvasRenderError">
          <Popover button={button}>{() => <Error payload={config} />}</Popover>
        </div>,

        domNode,
        () => handlers.done()
      );
    };

    draw();

    handlers.onResize(draw);

    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});
