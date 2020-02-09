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
import { ArgTypesStrings } from '../../../../i18n';

const { SeriesStyle: strings } = ArgTypesStrings;

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
  return `${strings.getStyleLabel()}: ${label}`;
};

const EnhancedExtendedTemplate = compose<ExtendedTemplateProps, Props>(
  lifecycle<Props, {}>({
    componentWillMount() {
      const label = get(this.props.argValue, 'chain.0.arguments.label.0', '');
      if (label) {
        this.props.setLabel(formatLabel(label, this.props));
      }
    },
    componentDidUpdate(prevProps) {
      const newLabel = get(this.props.argValue, 'chain.0.arguments.label.0', '');
      if (newLabel && prevProps.label !== formatLabel(newLabel, this.props)) {
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
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  template: templateFromReactComponent(EnhancedExtendedTemplate),
  simpleTemplate: templateFromReactComponent(SimpleTemplate),
  default: '{seriesStyle}',
});
