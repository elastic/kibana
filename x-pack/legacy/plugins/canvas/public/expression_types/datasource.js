/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Registry } from '@kbn/interpreter/common';
import { RenderToDom } from '../components/render_to_dom';
import { ExpressionFormHandlers } from '../../common/lib/expression_form_handlers';
import { BaseForm } from './base_form';

const defaultTemplate = () => (
  <div>
    <p>This datasource has no interface. Use the expression editor to make changes.</p>
  </div>
);

class DatasourceWrapper extends React.PureComponent {
  static propTypes = {
    spec: PropTypes.object.isRequired,
    datasourceProps: PropTypes.object.isRequired,
    handlers: PropTypes.object.isRequired,
  };

  componentDidUpdate() {
    this.callRenderFn();
  }

  componentWillUnmount() {
    this.props.handlers.destroy();
  }

  callRenderFn = () => {
    const { spec, datasourceProps, handlers } = this.props;
    const { template } = spec;
    template(this.domNode, datasourceProps, handlers);
  };

  render() {
    return (
      <RenderToDom
        render={domNode => {
          this.domNode = domNode;
          this.callRenderFn();
        }}
      />
    );
  }
}

export class Datasource extends BaseForm {
  constructor(props) {
    super(props);

    this.template = props.template || defaultTemplate;
    this.image = props.image;
  }

  render(props = {}) {
    const expressionFormHandlers = new ExpressionFormHandlers();
    return (
      <DatasourceWrapper spec={this} handlers={expressionFormHandlers} datasourceProps={props} />
    );
  }
}

class DatasourceRegistry extends Registry {
  wrapper(obj) {
    return new Datasource(obj);
  }
}

export const datasourceRegistry = new DatasourceRegistry();
