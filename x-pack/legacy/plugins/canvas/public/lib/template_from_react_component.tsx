/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ComponentType, FunctionComponent } from 'react';
import { unmountComponentAtNode, render } from 'react-dom';
import PropTypes from 'prop-types';
import { ErrorBoundary } from '../components/enhance/error_boundary';
import { ArgumentHandlers } from '../../types/arguments';

interface Props {
  renderError: Function;
}

export const templateFromReactComponent = (Component: ComponentType<any>) => {
  const WrappedComponent: FunctionComponent<Props> = props => (
    <ErrorBoundary>
      {({ error }: { error: Error }) => {
        if (error) {
          props.renderError();
          return null;
        }

        return <Component {...props} />;
      }}
    </ErrorBoundary>
  );

  WrappedComponent.propTypes = {
    renderError: PropTypes.func,
  };

  return (domNode: HTMLElement, config: Props, handlers: ArgumentHandlers) => {
    try {
      const el = React.createElement(WrappedComponent, config);
      render(el, domNode, () => {
        handlers.done();
      });

      handlers.onDestroy(() => {
        unmountComponentAtNode(domNode);
      });
    } catch (err) {
      handlers.done();
      config.renderError();
    }
  };
};
