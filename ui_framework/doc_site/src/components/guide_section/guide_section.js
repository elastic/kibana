import PropTypes from 'prop-types';
import React, { Component } from 'react';

import hljs from 'highlight.js';

import {
  KuiText,
  KuiTitle,
  KuiSpacer,
  KuiTabs,
  KuiTab,
} from '../../../../components';

import Slugify from '../../services/string/slugify';

export class GuideSection extends Component {
  constructor(props) {
    super(props);
    this.onClickSource = this.onClickSource.bind(this);

    this.tabs = [{
      id: 'demo',
      name: 'Demo',
    }, {
      id: 'javascript',
      name: 'JavaScript',
    }, {
      id: 'html',
      name: 'HTML',
    }];

    this.state = {
      selectedTabId: 'demo',
    };
  }

  onSelectedTabChanged = id => {
    this.setState({
      selectedTabId: id,
    });
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

  componentDidUpdate() {
    if (this.refs.html) {
      hljs.highlightBlock(this.refs.html);
    }

    if (this.refs.javascript) {
      hljs.highlightBlock(this.refs.javascript);
    }
  }

  renderTabs() {
    return this.tabs.map((tab,index) => (
      <KuiTab
        onClick={() => this.onSelectedTabChanged(tab.id)}
        isSelected={tab.id === this.state.selectedTabId}
        key={index}
      >
        {tab.name}
      </KuiTab>
    ));
  }

  renderSection(type, code) {
    const typeToCodeClassMap = {
      JavaScript: 'javascript',
      HTML: 'html',
    };

    const codeClass = typeToCodeClassMap[type];

    if (code && (codeClass === this.state.selectedTabId)) {
      return (
        <div key={type} ref={type}>
          <pre style={{ whiteSpace: 'pre-wrap' }}>
            <code
              ref={codeClass}
              className={codeClass}
            >
              {code}
            </code>
          </pre>
        </div>
      );
    }
  }

  renderDemo() {
    if (this.props.demo && (this.state.selectedTabId === 'demo')) {
      return (
        <div>
          <div className="guideSection__space" />
          {this.props.demo}
        </div>
      );
    }
  }

  render() {

    const codeSections = this.props.source.map(sourceObject => (
      this.renderSection(sourceObject.type, sourceObject.code)
    ));

    return (
      <div className="guideSection">
        <div className="guideSection__text">
          <KuiTitle>
            <h2>{this.props.title}</h2>
          </KuiTitle>
          <KuiSpacer size="m" />
          <KuiText>{this.props.text}</KuiText>
        </div>
        <KuiSpacer size="m" />
        <KuiTabs>
          {this.renderTabs()}
        </KuiTabs>
        {this.renderDemo()}
        {codeSections}
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
