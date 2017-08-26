import React, {
  Component,
  PropTypes,
} from 'react';

import {
  KuiFlexGroup,
  KuiFlexItem,
  KuiTitle,
  KuiSpacer,
  KuiButton,
} from '../../../../components';

import Slugify from '../../services/string/slugify';

export class GuideSection extends Component {
  constructor(props) {
    super(props);
    this.onClickSource = this.onClickSource.bind(this);
  }

  getId() {
    return Slugify.one(this.props.title);
  }

  onClickSource() {
    this.props.openCodeViewer(this.props.source, this.props.title);
  }

  componentWillMount() {
    this.props.registerSection(this.getId(), this.props.title);
  }

  componentWillUnmount() {
    this.props.unregisterSection(this.getId());
  }

  render() {
    return (
      <div className="guideSection">
        <KuiFlexGroup id={this.getId()} justifyContent="spaceBetween">
          <KuiFlexItem grow={false}>
            <KuiTitle>
              <h2>{this.props.title}</h2>
            </KuiTitle>
          </KuiFlexItem>
          <KuiFlexItem grow={false}>
            <KuiButton
              size="small"
              onClick={this.onClickSource}
            >
              View code
            </KuiButton>
          </KuiFlexItem>
        </KuiFlexGroup>
        <KuiSpacer size="m" />
        {this.props.children}
      </div>
    );
  }
}

GuideSection.propTypes = {
  title: PropTypes.string,
  source: PropTypes.array,
  children: PropTypes.any,
  openCodeViewer: PropTypes.func,
  registerSection: PropTypes.func,
  unregisterSection: PropTypes.func,
};
