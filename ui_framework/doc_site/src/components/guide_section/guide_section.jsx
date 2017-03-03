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
      <div
        id={this.getId()}
        className="guideSection"
      >
        <div className="guideSection__header">
          <div className="guideSection__title">
            {this.props.title}
          </div>
          <button
            className="guideSection__sourceButton"
            onClick={this.onClickSource}
          >
            <span className="fa fa-code"></span>
          </button>
        </div>

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
