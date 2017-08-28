import PropTypes from 'prop-types';
import React, { Component } from 'react';

import {
  Routes,
  getTheme,
  applyTheme,
} from '../services';

import {
  GuideHeader,
  GuideNav,
} from '../components';

import {
  KuiPage,
  KuiPageBody,
  KuiPageContent,
  KuiPageContentBody,
  KuiPageSideBar,
} from '../../../components';

export class AppView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isNavOpen: false,
      isChromeVisible: true,
      theme: getTheme(),
    };

    this.onHideChrome = this.onHideChrome.bind(this);
    this.onShowChrome = this.onShowChrome.bind(this);
    this.onToggleTheme = this.onToggleTheme.bind(this);
  }

  onToggleTheme() {
    if (getTheme() === 'light') {
      applyTheme('dark');
    } else {
      applyTheme('light');
    }

    this.setState({
      theme: getTheme(),
    });
  }

  onHideChrome() {
    this.setState({
      isChromeVisible: false,
    });

    this.props.closeCodeViewer();
  }

  onShowChrome() {
    this.setState({
      isChromeVisible: true,
    });
  }

  renderChrome() {

    if (this.state.isChromeVisible) {
      return (
        <KuiPage>
          <KuiPageBody>
            <KuiPageSideBar>
              <GuideNav
                isChromeVisible={this.state.isChromeVisible}
                isNavOpen={this.state.isNavOpen}
                isSandbox={this.props.isSandbox}
                onHideChrome={this.onHideChrome}
                onShowChrome={this.onShowChrome}
                onToggleNav={this.onToggleNav}
                onToggleTheme={this.onToggleTheme}
                routes={this.props.routes}
                components={Routes.components}
                sandboxes={Routes.sandboxes}
              />
            </KuiPageSideBar>
            <KuiPageContent>
              <KuiPageContentBody>
                {this.props.children}
              </KuiPageContentBody>
            </KuiPageContent>
          </KuiPageBody>
        </KuiPage>
      );
    } else {
      return (
        <div className="guide__hasNoChrome">
          <GuideHeader
            isChromeVisible={this.state.isChromeVisible}
            isNavOpen={this.state.isNavOpen}
            onHideChrome={this.onHideChrome}
            onShowChrome={this.onShowChrome}
            onToggleNav={this.onToggleNav}
            onToggleTheme={this.onToggleTheme}
            routes={this.props.routes}
            components={Routes.components}
          />
          {this.props.children}
        </div>
      );
    }
  }

  render() {

    return (
      <div className="guide">
        {this.renderChrome()}
      </div>
    );
  }
}

AppView.propTypes = {
  children: PropTypes.any,
  routes: PropTypes.array.isRequired,
  registerSection: PropTypes.func,
  unregisterSection: PropTypes.func,
  sections: PropTypes.array,
  source: PropTypes.array,
  title: PropTypes.string,
};

AppView.defaultProps = {
  source: [],
};
