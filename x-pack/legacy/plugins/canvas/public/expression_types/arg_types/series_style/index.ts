/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import { lifecycle, compose } from 'recompose';
import { get } from 'lodash';
import { templateFromReactComponent } from '../../../lib/template_from_react_component';
import { SimpleTemplate } from './simple_template';
import { ExtendedTemplate, Props as ExtendedTemplateProps } from './extended_template';
import { ExpressionAST } from '../../../../types';

interface Props {
  argValue: ExpressionAST;
  renderError: Function;
  setLabel: Function;
  label: string;
}

const formatLabel = (label: string, props: Props) => {
  if (typeof label !== 'string') {
    props.renderError();
  }
  return `Style: ${label}`;
};

const EnhancedExtendedTemplate = compose<ExtendedTemplateProps, Props>(
  lifecycle<Props, {}>({
    componentWillMount() {
      const label = get(this.props.argValue, 'chain.0.arguments.label.0', '');
      if (label) {
        this.props.setLabel(formatLabel(label, this.props));
      }
    },
    componentWillReceiveProps(newProps) {
      const newLabel = get(newProps.argValue, 'chain.0.arguments.label.0', '');
      if (newLabel && this.props.label !== formatLabel(newLabel, this.props)) {
        this.props.setLabel(formatLabel(newLabel, this.props));
      }
    },
  })
)(ExtendedTemplate);

EnhancedExtendedTemplate.propTypes = {
  argValue: PropTypes.any.isRequired,
  setLabel: PropTypes.func.isRequired,
  label: PropTypes.string,
};

export const seriesStyle = () => ({
  name: 'seriesStyle',
  displayName: 'Series style',
  help: 'Set the style for a selected named series',
  template: templateFromReactComponent(EnhancedExtendedTemplate),
  simpleTemplate: templateFromReactComponent(SimpleTemplate),
  default: '{seriesStyle}',
});
