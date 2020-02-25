/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Suggestion } from '../suggestion';
import { rgba } from 'polished';
import theme from '@elastic/eui/dist/eui_theme_light.json';

const List = styled.ul`
  width: 100%;
  border: 1px solid ${theme.euiColorLightShade};
  border-radius: ${theme.euiSizeXS};
  box-shadow: 0px ${theme.euiSizeXS} ${theme.euiSizeXL} ${rgba(theme.euiTextColor, 0.1)};
  position: absolute;
  background: #fff;
  z-index: 10;
  left: 0;
  max-height: ${theme.euiSize * 20}px;
  overflow: scroll;
`;

export class Suggestions extends Component {
  childNodes = [];

  scrollIntoView = () => {
    const parent = this.parentNode;
    const child = this.childNodes[this.props.index];

    if (this.props.index == null || !parent || !child) {
      return;
    }

    const scrollTop = Math.max(
      Math.min(parent.scrollTop, child.offsetTop),
      child.offsetTop + child.offsetHeight - parent.offsetHeight
    );

    parent.scrollTop = scrollTop;
  };

  componentDidUpdate(prevProps) {
    if (prevProps.index !== this.props.index) {
      this.scrollIntoView();
    }
  }

  render() {
    if (!this.props.show || this.props.suggestions.length === 0) {
      return null;
    }

    const suggestions = this.props.suggestions.map((suggestion, index) => {
      const key = `${suggestion}_${index}`;
      return (
        <Suggestion
          innerRef={node => (this.childNodes[index] = node)}
          selected={index === this.props.index}
          suggestion={suggestion}
          onClick={this.props.onClick}
          onMouseEnter={() => this.props.onMouseEnter(index)}
          key={key}
        />
      );
    });

    return <List innerRef={node => (this.parentNode = node)}>{suggestions}</List>;
  }
}

Suggestions.propTypes = {
  index: PropTypes.number,
  onClick: PropTypes.func.isRequired,
  onMouseEnter: PropTypes.func.isRequired,
  show: PropTypes.bool,
  suggestions: PropTypes.array.isRequired,
};
