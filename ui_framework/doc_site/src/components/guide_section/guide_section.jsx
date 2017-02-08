import React, {
  Component,
  PropTypes,
} from 'react';

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
    this.context.openCodeViewer(this.props.source);
  }

  componentWillMount() {
    this.context.registerSection(this.getId(), this.props.title);
  }

  componentWillUnmount() {
    this.context.unregisterSection(this.getId());
  }

  render() {
    return (
      <div
        id={this.getId()}
        className="guideSection"
      >
        <div className="guideSection__header">
          <div className="guideSection__title">
            {this.props.title}
          </div>
          <div
            className="guideSection__sourceButton fa fa-code"
            onClick={this.onClickSource}
          />
        </div>

        {this.props.children}
      </div>
    );
  }
}

GuideSection.TYPES = {
  JS: 'JavaScript',
  HTML: 'HTML',
};

GuideSection.contextTypes = {
  openCodeViewer: PropTypes.func,
  registerSection: PropTypes.func,
  unregisterSection: PropTypes.func,
};

GuideSection.propTypes = {
  title: PropTypes.string,
  source: PropTypes.array,
  children: PropTypes.any,
};
